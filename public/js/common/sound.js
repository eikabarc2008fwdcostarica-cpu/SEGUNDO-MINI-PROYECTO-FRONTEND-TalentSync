"use strict";
import{$}from"./ui.js";
const KEY="talentsync_notification_sound";let context;
const enabled=()=>localStorage.getItem(KEY)!=="off";
export function initNotificationSound(){const button=$("#sound-toggle");if(!button)return;const sync=()=>button.textContent=`Sonido: ${enabled()?"activado":"desactivado"}`;sync();button.onclick=()=>{localStorage.setItem(KEY,enabled()?"off":"on");sync()};addEventListener("pointerdown",()=>{context||=new(window.AudioContext||window.webkitAudioContext)()},{once:true})}
export function playNotificationSound(){if(!enabled()||!context)return;const now=context.currentTime;[660,880].forEach((frequency,index)=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,now+index*.12);gain.gain.exponentialRampToValueAtTime(.08,now+index*.12+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+index*.12+.18);oscillator.connect(gain).connect(context.destination);oscillator.start(now+index*.12);oscillator.stop(now+index*.12+.2)})}
