import React from 'react';
import { TimelineMax } from 'gsap';

let globalOptions = {};

// map between timeline id and timeline instance. create default timeline 'master'
let timelines = {
    master: new TimelineMax({
        autoRemoveChildren: true
    })
};

// maps between mounted components and their instances. used for debugging
let components = {};

let scenarios = {};

let scenarioIdCounter = 0;
let componentIdCounter = 0;

function attachAnimation(WrappedComponent, scenariosConfig = []){

    scenariosConfig.forEach(scenarioConfig => {
        // add ids to scenario configs with no id specified
        if ('id' in scenarioConfig === false){
            scenarioConfig.id = `scenario_${++scenarioIdCounter}`;
        }

        // generate timeline instance if it doesn't exist yet
        if (scenarioConfig.timeline && !timelines[scenarioConfig.timeline]){
            timelines[scenarioConfig.timeline] = new TimelineMax({
                autoRemoveChildren: true
            });
        }

        // save the scenario to the global scenarios
        if (scenarioConfig.id in scenarios){
            error(`scenario with id ${scenarioConfig.id} already exists. It will be overwritten!`)
        } else {
            scenarios[scenarioConfig.id] = scenarioConfig;
        }
    });

    return class AnimatedComponent extends React.Component {

        /**
         *  @typedef AnimationConfig
         *  @type {string | object | function)}
         *
         *  @example <caption>string</caption>
         *  'fadeIn'
         *
         *  @example <caption>Array of strings</caption>
         *  ['fadeIn', 'expand']
         *
         *  @example <caption>object</caption>
         *  {
         *      animation: 'fadeIn',
         *      position: 'withPrev',
         *      immediate: false,
         *      onComplete: ()=>{}
         *  }
         *
         *  @example <caption>function</caption>
         *  A functiont hat receives the context the AnimatedComponent running the animation and returns an AnimationConfig in object format
         *  animatedComponentInstance => {
         *      animation: 'fadeIn',
         *      position: '+=2',
         *  }
         */

        constructor(props){
            super(props);
            // if no displayName is specified, use 'AnimationComponent';
            let componentDisplayName = WrappedComponent.displayName?WrappedComponent.displayName:`AnimatedComponent`;
            this.animationComponentId = `${componentDisplayName}_${++componentIdCounter}`;
            components[this.animationComponentId] = {
                animations: {},
                runningAnimations: {},
                preparingToAnimate: false,
                instance: this
            };

            this.wrappedComponentRef = React.createRef();
        }

        componentDidMount(){
            components[this.animationComponentId].mounted = true;
        }

        componentWillUnmount(){
            components[this.animationComponentId].mounted = false;
        }

        componentDidUpdate(prevProps){
            scenariosConfig
            // we're only interested in scenarios that have triggers
                .filter ( scenariosConfig => 'trigger' in scenariosConfig)
                // if multiple scenarios are defined, we only run the first one reached
                .some( scenarioConfig => this.testScenario(scenarioConfig, prevProps));
        }

        testScenario(scenarioConfig, prevProps){
            // ensure we have triggers as an array
            let triggerArray = Array.isArray(scenarioConfig.trigger) ? scenarioConfig.trigger : [scenarioConfig.trigger];
            let firedTriggerConfig = triggerArray.find(triggerConfig => this.testTrigger(triggerConfig, prevProps) );
            if (firedTriggerConfig){
                if (globalOptions.onScenarioTriggered) {
                    globalOptions.onScenarioTriggered(scenarioConfig);
                }
                this.addScenarioAnimations(scenarioConfig, prevProps, firedTriggerConfig);
            }

            return firedTriggerConfig !== undefined;
        }

        testTrigger(triggerConfig, prevProps){
            if (typeof triggerConfig === 'object'){
                return triggerConfig.select(prevProps) === triggerConfig.value &&
                    triggerConfig.select(this.props) === triggerConfig.nextValue;
            }
            else if (typeof triggerConfig === 'function'){
                return triggerConfig(this.wrappedComponentRef.current, prevProps);
            }
        }

        addScenarioAnimations(scenarioConfig, prevProps, triggerConfig){
            let timeline = timelines[scenarioConfig.timeline || 'master'];
            if (scenarioConfig.interrupt){
                timeline.progress(1, false);
            }

            // scenarios that are triggered can resolve functions to return animation config in runtime
            let scenarioConfigDraft = {...scenarioConfig};
            if (typeof scenarioConfigDraft.animations === 'function'){
                scenarioConfigDraft.animations = scenarioConfig.animations(this.wrappedComponentRef.current, prevProps)
            }

            addScenarioAnimations(scenarioConfigDraft , {
                thisContext: this,
                triggerConfig
            });
        }

        /**
         *
         * @param {AnimationConfig | AnimationConfig[])} animations
         * @param timelineOrTimelineId
         */
        addAnimation(animations, timelineOrTimelineId, options = {}) {
            let componentData = components[this.animationComponentId];

            // for convenience we assume we have an array of AnimationConfigs
            let animationConfigArray = Array.isArray(animations) ? animations : [animations];
            animationConfigArray.forEach((rawAnimationConfig, index) => {
                let animationConfig = transformAnimationConfig(rawAnimationConfig, this);
                let animationData = componentData.animations[animationConfig.animation];
                if (!animationData) {
                    error(`No such animation "${animationConfig.animation}" for component "${this.animationComponentId}". Perhaps you meant to call the global addAnimation?`)
                    return;
                }
                let animationTlToAdd = animationData.generatorFunc(animationData.elementRef, animationConfig.animationOptions);

                // figure out which timeline
                let timeline;
                if (typeof timelineOrTimelineId  === 'undefined' || timelineOrTimelineId === null){
                    timeline = timelines['master'];
                } else if (typeof timelineOrTimelineId === 'string'){
                    timeline = timelines[timelineOrTimelineId];
                } else if (typeof timelineOrTimelineId === 'object'){
                    timeline = timelineOrTimelineId
                }

                function attachCallbackToTl(callbackType, callbackFunction, params){
                    let references = {
                        animationComponent: componentData.instance.wrappedComponentRef.current
                    };

                    if (options.thisContext){
                        references.triggerComponent = options.thisContext.wrappedComponentRef.current
                    }

                    function gsapCallback(tweenRef){
                        // save the tweenref, as GSAP only passes it via string {self} string replacement
                        references.tween = tweenRef;
                        let callbackArgs = [references];
                        if (params) {
                            callbackArgs = [...callbackArgs, ...params];
                        }
                        
                        callbackFunction.apply(callbackArgs);
                    }

                    animationTlToAdd.eventCallback(callbackType, gsapCallback, ['{self}']);
                }

                // actual animation start will happen in future cycles, for now we want to mark this component as animating
                components[this.animationComponentId].preparingToAnimate = true;

                attachCallbackToTl("onStart", (...args) => {
                    components[this.animationComponentId].preparingToAnimate = false;
                    components[this.animationComponentId].runningAnimations[animationConfig.animation] = true;

                    if (animationConfig.onStart){
                        animationConfig.onStart(...args);
                    }

                    if (options.firstAnimationInScenario && options.scenarioConfig && globalOptions.onScenarioStart){
                        globalOptions.onScenarioStart.apply([...args, options.scenarioConfig, options.triggerConfig]);
                    }

                });

                attachCallbackToTl("onComplete", (...args)=>{
                    components[this.animationComponentId].runningAnimations[animationConfig.animation] = false;

                    if (animationConfig.onComplete){
                        animationConfig.onComplete(...args);
                    }

                    if (options.lastAnimationInScenario){
                        // force the react component to re-render, in case we need to remove it from the DOM
                        this.forceUpdate();

                        if (options.scenarioConfig && globalOptions.onScenarioComplete) {
                            globalOptions.onScenarioComplete.apply([...args, options.scenarioConfig, options.triggerConfig]);
                        }
                    }
                });


                // "immediate" in config makes the timeline animation instantaneous
                if (animationConfig.immediate){
                    animationTlToAdd.duration(0.001);
                }

                // special case for starting an animation with the previous one
                if (animationConfig.position === 'withPrev'){
                    let newPosition = 0;
                    let timelineChildren = timeline.getChildren(false);
                    if (timelineChildren .length > 0) {
                        let previousTimeline = timelineChildren[timelineChildren.length - 1];
                        newPosition = previousTimeline.startTime();
                    }
                    animationConfig.position = newPosition;
                }
                timeline.add(animationTlToAdd, animationConfig.position);
            })
        }

        registerAnimation(animationId, generatorFunc, elementRef) {
            let componentAnimations = components[this.animationComponentId].animations;

            if (animationId in componentAnimations){
                error(`animationId ${animationId} already registered`);
            }
            else{
                componentAnimations[animationId] = {
                    generatorFunc,
                    elementRef,
                };


            }
        }

        getScenarios(){
            return scenariosConfig;
        }

        render() {
            let augmentedProps = {
                ...this.props,
                registerAnimation: this.registerAnimation.bind(this),
                addAnimation: this.addAnimation.bind(this)
            };

            let component = components[this.animationComponentId];
            // if shouldShow is specified, then component will be displayed as long as it has a running animation
            let hasRunningAnimations = component.preparingToAnimate ||
                                        Object.values(component.runningAnimations).some(isRunning=>isRunning);
            
            if ('shouldShow' in this.props === false ||
                ('shouldShow' in this.props && (this.props.shouldShow === true || hasRunningAnimations))){
                return <WrappedComponent ref={this.wrappedComponentRef} { ...augmentedProps} />;
            } else {
                    return null;
            }
        }
    };
}

/**
 *
 * @param {animationConfig | animationConfig[] } animationConfig
 * @param timelineOrTimelineId
 * @param {objects} options
 */
function addAnimation(animations, timelineOrTimelineId, options = {}) {
    // for convenience we assume we have an array of AnimationConfigs
    let animationConfigArray = Array.isArray(animations) ? animations : [animations];

    animationConfigArray.forEach((rawAnimationConfig, animationIndex) => {
        let animationConfig = transformAnimationConfig(rawAnimationConfig, options.thisContext);
        // search for components with this animationId
        let componentsWithAnimation = Object.values(components).filter(
            componentData => animationConfig.animation in componentData.animations
        );

        if (componentsWithAnimation.length > 0){
            componentsWithAnimation.forEach((componentData, componentIndex) => {
                options = {
                    ...options,
                    // the first animation on the first component
                    firstAnimationInScenario: animationIndex === 0 && componentIndex === 0,
                    // the last animation on the last component
                    lastAnimationInScenario: animationIndex === (animationConfigArray.length -1) && componentIndex === (componentsWithAnimation.length - 1)
                };
                componentData.instance.addAnimation(animationConfig, timelineOrTimelineId, options)
            })
        } else{
            error(`no components with such animation ${animationConfig.animation}. Did you forget to call registerAnimation()?`)
        }
    });

}

function addScenarioAnimations(scenarioConfig, options = {}){
    let scenarioConfigDraft = {...scenarioConfig};

    // use master timeline in scenario configs with no timeline specified
    if ('timeline' in scenarioConfigDraft === false){
        scenarioConfigDraft.timeline = 'master';
    }

    // make sure 'animations' is an array
    let animations;
    if (Array.isArray(scenarioConfigDraft.animations)){
        animations = scenarioConfigDraft.animations;
    } else if (typeof scenarioConfigDraft.animations === 'string'){
        animations = [scenarioConfigDraft.animations];
    }

    addAnimation(animations, scenarioConfigDraft.timeline, {
        ...options,
        scenarioConfig: scenarioConfigDraft
    });
}

function triggerScenario(scenarioId){
    if (scenarios[scenarioId]){
        addScenarioAnimations(scenarios[scenarioId])
    } else {
        error(`can't trigger scenario ${scenarioId}, no such scenario defined`);
    }
}

function getTimelines(timelineId){
    return timelines;
}

function setGlobalOptions(options){
    globalOptions = options;
}

/**
 * Private functions
 */

// gets an animationID, a function or a config and transforms it to a proper to feed to the run animation function
function transformAnimationConfig(inputAnimationConfig, thisContext){
    // avoid double transformation
    if (inputAnimationConfig.__transformed) {
        return inputAnimationConfig
    };

    let animationConfig;
    if (typeof inputAnimationConfig === 'string'){
        animationConfig = {
            animation: inputAnimationConfig
        }
    }
    else if (typeof inputAnimationConfig === 'function') {
        if (thisContext && thisContext.animationComponentId){
            let funcResult = inputAnimationConfig.call(thisContext.wrappedComponentRef.current);
            if (typeof funcResult === 'string'){
                animationConfig = {
                    animation: funcResult
                }

            } else if (funcResult === null || typeof funcResult === 'undefined'){
                error('animation config function returned null or undefined');
            } else {
                // function returned object
                animationConfig = funcResult;
            }
        } else {
            error(`Can't evaluate animation config without a "this" context`);
        }
    }
    else{
        animationConfig = inputAnimationConfig;
    }

    // defaults
    animationConfig =
        {
            position: "+=0",
            ...animationConfig,
            __transformed: true
        };

    return animationConfig;
}

// todo this is for debug and should not be exposed
function getComponents(){
    return components;
}

function error(message){
    console.error(`AnimationOrchestrator: ${message}`);
}


export {
    attachAnimation,
    getComponents,
    addAnimation,
    triggerScenario,
    getTimelines,
    setGlobalOptions
}

//
// usage
// attachAnimation(componentClass, [{
//         id: 'string // optional, autogenerated if not specified
//         trigger: {select, value: 'string', nextValue: 'string'} // or function, or array of either
//         animations: ['animId1', 'animId2'], // or function that decideds on an animation at runtime
//         timeline: timelineId // (or default scoped)
//         interrupt: false
//     }]
// )
//
// registerAnimation('animationId', generatorFunc, elementRef)