import test from "node:test";
import assert from "node:assert/strict";
import { parseValidation, validateQuest } from "../shared/quest-ai";
import { callMuseJson } from "../shared/meta-ai";
const expected = ["Two hands visible", "A cup is visible"];
const valid = { criteria: [{index:2,met:true,evidence:"Cup"},{index:1,met:true,evidence:"Hands"}], confidence:0.9,reasoning:"Visible evidence" };
test("Arjit’s judge matches numbered evidence and rejects incomplete responses", () => {
 assert.equal(parseValidation(expected, valid).completed, true);
 assert.equal(parseValidation(expected, {...valid,criteria:[valid.criteria[0],{...valid.criteria[1],met:false}]}).completed,false);
 for (const criteria of [[],[valid.criteria[0]],[valid.criteria[0],valid.criteria[0]],[{...valid.criteria[0],index:3},valid.criteria[1]]])
   assert.throws(()=>parseValidation(expected,{...valid,criteria}));
 assert.throws(()=>parseValidation(expected,{...valid,confidence:"1"}));
});
test("live judging ignores MUSE_MOCK and never exposes upstream error bodies", async () => {
 const previous = {key:process.env.META_AI_API_KEY,mock:process.env.MUSE_MOCK};
 process.env.META_AI_API_KEY="test-only-key";
 process.env.MUSE_MOCK="true";
 try {
  let called = false;
  const result = await validateQuest({title:"Test",description:"Test",completionCriteria:expected}, "data:image/jpeg;base64,AA==", {fetcher:async (_url,init)=>{
   called=true;
   assert.ok(JSON.parse(String(init?.body)).messages[1].content.some((p:{type:string})=>p.type==="image_url"));
   return Response.json({choices:[{message:{content:JSON.stringify({...valid,criteria:valid.criteria.map(c=>({...c,met:false}))})}}]});
  }});
  assert.ok(called); assert.equal(result.completed,false);
  await assert.rejects(callMuseJson([], {fetcher:async()=>new Response("secret-provider-detail",{status:401})}), error=>error instanceof Error && !error.message.includes("secret-provider-detail"));
 } finally {
  if(previous.key===undefined) delete process.env.META_AI_API_KEY; else process.env.META_AI_API_KEY=previous.key;
  if(previous.mock===undefined) delete process.env.MUSE_MOCK; else process.env.MUSE_MOCK=previous.mock;
 }
});
