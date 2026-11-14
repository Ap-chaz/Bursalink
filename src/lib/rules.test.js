import {describe,it,expect} from 'vitest'
import {placeOk,isOpen,daysLeft,canApply,eligibility,completion,validateFile} from './rules.js'
const area={county:'A',constituency:'B',ward:'C'}
const b=(o={})=>({status:'published',opens:'2026-01-01',closes:'2026-12-31',place:null,levels:['secondary'],docs:['ID'],...o})
const day=new Date('2026-06-01')
describe('rules',()=>{
 it('open to everyone accepts all',()=>expect(placeOk(b(),area)).toBe(true))
 it('area must match',()=>{expect(placeOk(b({place:{type:'ward',name:'C'}}),area)).toBe(true);expect(placeOk(b({place:{type:'ward',name:'X'}}),area)).toBe(false)})
 it('date window',()=>{expect(isOpen(b(),day)).toBe(true);expect(isOpen(b({closes:'2026-05-31'}),day)).toBe(false);expect(isOpen(b({opens:'2026-06-02'}),day)).toBe(false)})
 it('only published',()=>expect(isOpen(b({status:'draft'}),day)).toBe(false))
 it('days left',()=>expect(daysLeft(b({closes:'2026-06-04'}),day)).toBe(3))
 it('cannot apply without area',()=>expect(canApply(b(),null,day)).toBe(false))
 it('eligibility lists meets/not/missing',()=>{const e=eligibility(b(),{area,level:'university',docs:{}});expect(e.meets).toContain('area');expect(e.not).toContain('level');expect(e.missing).toContain('doc:ID')})
 it('completion',()=>expect(completion({name:'a',phone:'1'})).toBe(29))
 it('file rules',()=>{expect(validateFile({type:'image/gif',size:1})).toBe('type');expect(validateFile({type:'image/png',size:6e6})).toBe('size');expect(validateFile({type:'application/pdf',size:1e6})).toBeNull()})
})
