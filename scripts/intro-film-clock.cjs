'use strict';
// Only loaded by the offline media renderer, never by the application launcher.
if (process.env.INTRO_SYNTHETIC_CLOCK !== 'true' || process.env.NODE_ENV !== 'development') {
  throw new Error('Synthetic film clock is restricted to the local authoring fixture.');
}
const RealDate = Date;
const epoch = RealDate.parse('2026-11-23T09:30:00Z');
const origin = RealDate.now();
const net=require('node:net');
const listen=net.Server.prototype.listen;
net.Server.prototype.listen=function(port,...args){
  if(typeof port!=='number')throw new Error('Film fixture requires a numeric loopback port.');
  if(typeof args[0]==='string'&&args[0]!=='127.0.0.1')throw new Error('Only loopback is allowed for film fixtures.');
  if(typeof args[0]!=='string')args.unshift('127.0.0.1');
  return listen.call(this,port,...args);
};
global.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [epoch + RealDate.now() - origin])); }
  static now() { return epoch + RealDate.now() - origin; }
};
// Provider boundary only: no external push transport exists in this fixture.
// Registration and every application endpoint remain real; this is NOT receipt proof.
require('web-push').sendNotification = async () => ({ statusCode: 201, body: 'LOCAL_DEMO_NO_SEND' });
