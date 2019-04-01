import React from "react";
import { TimelineMax, Power2} from 'gsap';
import 'gsap/CSSPlugin'

import { attachAnimation } from "@ekolabs/react-animation-orchestrator";

const generateSelectAnimation = function(ref, options){
    let tl = new TimelineMax();
    let xOffset = options.x;
    let yOffset = options.y;
    let optionEl = ref.current;
    let activeBackground = optionEl.querySelector('.activeBackground');

    tl
        .set(activeBackground, {
            scale: 0.1,
            transformOrigin: 'center',
            opacity: 0,
            left: xOffset,
            top: yOffset
        })
        .set(optionEl, { webkitClipPath: `circle(150% at ${xOffset}px ${yOffset}px)` })
        .to(activeBackground, 0.3, {
            scale: 1.5,
            transformOrigin: 'center',
            opacity: 1,
            ease: Power2.easeOut
        })
        .to(optionEl, 0.5, {
            webkitClipPath: `circle(0.1% at ${xOffset}px ${yOffset}px)`,
            ease: Power2.easeOut
        }, 0.3);

    return tl;
};

const generateMoveUpAnimation = function(ref, options){
    let tl = new TimelineMax();
    let optionEl = ref.current;

    // element might have already been removed
    if (optionEl) {
        tl.fromTo(optionEl, 0.5,
            { y: 72 },
            { y: 0,  immediateRender:false })
    }

    return tl;
};

class Option extends React.Component {
    constructor(props){
        super(props);
        this.ref = React.createRef();
        this.props.registerAnimation(`option_select_${this.props.option.value}`, generateSelectAnimation, this.ref);
        this.props.registerAnimation(`option_moveup_${this.props.option.value}`, generateMoveUpAnimation, this.ref);
    }
    

    onSelect(e){
        let boundingRect = this.ref.current.getBoundingClientRect();
        let offset = {
            x: e.clientX - boundingRect.left,
            y: e.clientY - boundingRect.top
        };
        this.props.onSelect(this.props.option.value, offset);
    }

    render(){
        return (
            <li ref={this.ref} onClick={e=>this.onSelect(e)}>
                <span className="caption">{this.props.option.name}</span>
                <div className="activeBackground"/>
            </li>
        )
    }
}

Option.displayName = 'Option';

export default attachAnimation(Option);