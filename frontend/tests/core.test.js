import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomationEngine, DEFAULT_RULES, normalizeRules } from '../src/core/automation.js';
import { createSession, recordSample, completeSession, demoMetrics, exportSession } from '../src/core/session.js';
import { scoreLandmarks } from '../src/features/focus/signals.js';
import { load, save, validSession } from '../src/core/storage.js';
const rule = changes => ({ ...DEFAULT_RULES[0], duration: 3, cooldown: 10, ...changes });
const low = { face: true, score: 25 }, high = { face: true, score: 90 };
test('a momentary distraction never triggers; a sustained one does', () => {
  const e = new AutomationEngine(), r = [rule()];
  assert.equal(e.evaluate(r, low, 0).length, 0);
  assert.equal(e.evaluate(r, high, 2000).length, 0);
  assert.equal(e.evaluate(r, low, 3000).length, 0);
  assert.equal(e.evaluate(r, low, 5999).length, 0);
  assert.equal(e.evaluate(r, low, 6000).length, 1);
});
test('cooldowns prevent repeated actions', () => {
  const e = new AutomationEngine(), r = [rule()];
  e.evaluate(r, low, 0); assert.equal(e.evaluate(r, low, 3000).length, 1);
  assert.equal(e.evaluate(r, low, 6000).length, 0);
  assert.equal(e.evaluate(r, low, 13000).length, 1);
});
test('disabled or reconfigured rules cannot reuse old dwell time', () => {
  const e = new AutomationEngine(); e.evaluate([rule()], low, 0);
  assert.equal(e.evaluate([rule({ enabled:false })], low, 4000).length, 0);
  assert.equal(e.evaluate([rule()], low, 5000).length, 0);
  assert.equal(e.evaluate([rule({ threshold:40 })], low, 9000).length, 0);
});
test('pause resets continuity but retains cooldowns', () => {
  const e = new AutomationEngine(), r = [rule()];
  e.evaluate(r, low, 0); e.resetContinuity();
  assert.equal(e.evaluate(r, low, 4000).length, 0);
  assert.equal(e.evaluate(r, low, 7000).length, 1);
});
test('missing faces trigger away rules, not distraction or focused rules', () => {
  const e = new AutomationEngine(), r = [rule(), rule({id:'away',trigger:'away',action:'pause'})];
  e.evaluate(r, {face:false,score:0}, 0);
  const events=e.evaluate(r,{face:false,score:0},3000);
  assert.deepEqual(events.map(e=>e.ruleId), ['away']); assert.equal(events[0].action,'pause');
});
test('break reminders fire once per interval and do not create a catch-up burst', () => {
  const e = new AutomationEngine(), r=[rule({trigger:'interval',duration:60,cooldown:1})];
  assert.equal(e.evaluate(r,high,59000).length,0);
  assert.equal(e.evaluate(r,high,60000).length,1);
  assert.equal(e.evaluate(r,high,61000).length,0);
  assert.equal(e.evaluate(r,high,180000).length,1);
});
test('focused milestone respects its threshold', () => {
  const e=new AutomationEngine(), r=[rule({trigger:'focused',threshold:80})];
  e.evaluate(r,high,0); assert.equal(e.evaluate(r,high,3000).length,1);
});
test('invalid stored rule configuration falls back or clamps', () => {
  assert.equal(normalizeRules(null).length,4);
  const r=normalizeRules([{id:'refocus',threshold:900,duration:-8,action:'unknown'}])[0];
  assert.equal(r.threshold,100);assert.equal(r.duration,1);assert.equal(r.action,'coach');
});
test('session aggregates include all observations and export valid CSV', () => {
  const s=createSession(' A test ', 'demo',25); s.elapsed=1000;recordSample(s,high);
  s.elapsed=2000;recordSample(s,low);const r=completeSession(s);
  assert.equal(r.title,'A test');assert.equal(r.average,58);assert.equal(r.focusedMs,1000);
  assert.equal(r.focusPercent,50);assert.equal(r.longestStreak,1000);assert.equal(r.mode,'demo');
  assert.equal(exportSession(r),'elapsed_seconds,focus_score,face_present\n1.0,90,true\n2.0,25,true');
  assert.equal(validSession(r),true);
});
test('long unobserved gaps do not earn focus credit',()=>{
  const s=createSession('x','camera',25);s.elapsed=100000;recordSample(s,high);assert.equal(s.focusedMs,2000);
});
test('history memory is bounded while session averages remain complete',()=>{
  const s=createSession('x','demo',120);for(let i=1;i<=7300;i++){s.elapsed=i*1000;recordSample(s,high);}
  assert.equal(s.samples.length,7200);assert.equal(s.sampleCount,7300);assert.equal(completeSession(s).average,90);
});
test('demo exercises the same real rule engine',()=>{
  const e=new AutomationEngine();let events=[];for(let i=1;i<30;i++)events.push(...e.evaluate(DEFAULT_RULES,demoMetrics(i),i*1000));
  assert.ok(events.some(e=>e.ruleId==='refocus'));
});
test('no landmarks produce absence, never fabricated attention',()=>{assert.equal(scoreLandmarks([]).face,false);assert.equal(scoreLandmarks([]).score,0);});
test('landmark scores are finite and bounded',()=>{
  const points=Array.from({length:478},()=>({x:.5,y:.5}));
  points[33]={x:.3,y:.4};points[133]={x:.4,y:.4};points[362]={x:.6,y:.4};points[263]={x:.7,y:.4};points[468]={x:.35,y:.4};points[473]={x:.65,y:.4};
  const r=scoreLandmarks(points);assert.ok(r.face);for(const key of ['score','gaze','posture','eyes'])assert.ok(r[key]>=0&&r[key]<=100);
});
test('storage failures and corrupt values are recoverable',()=>{
  globalThis.localStorage={getItem:()=>'{bad',setItem:()=>{throw Error('quota')}};
  assert.deepEqual(load('sessions',[]),[]);assert.equal(save('sessions',[]),false);assert.equal(validSession({}),false);
});
