import test from 'node:test';
import assert from 'node:assert/strict';
import {checkedCheckoutUrl,deliveryCovered,sendOrder} from '../order-client.js';
test('checkout restricts host and environment',()=>{assert.throws(()=>checkedCheckoutUrl('https://evil.example/p/?public-key=pub_prod_x','prod'));assert.throws(()=>checkedCheckoutUrl('https://checkout.wompi.co/p/?public-key=pub_test_x','prod'));assert.match(checkedCheckoutUrl('https://checkout.wompi.co/p/?public-key=pub_prod_x','prod'),/wompi/);});
test('free shipping excludes rural properties and unlisted cities',()=>{const d=[{department:'Antioquia',city:'Medellín'}];assert.equal(deliveryCovered(d,'Antioquia','Medellín','urban','Casa'),true);assert.equal(deliveryCovered(d,'Antioquia','Medellín','urban','Finca / zona rural'),false);assert.equal(deliveryCovered(d,'Antioquia','Medellín','rural','Casa'),false);assert.equal(deliveryCovered(d,'Antioquia','Otro','urban','Casa'),false);});
test('client rejects cross-environment registration',async()=>{await assert.rejects(sendOrder({orderUrl:'https://example.com',environment:'prod',publicKey:'public'},{},async()=>Response.json({environment:'test',reference:'fake'})));});
