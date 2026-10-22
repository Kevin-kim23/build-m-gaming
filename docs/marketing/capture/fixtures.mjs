// Builds synthetic saves (run inside the page via seed()).
export const helpers = `
const U=Object.values(mods.units).map(u=>({field:u.field,power:Number(u.power)})).sort((a,b)=>b.power-a.power);
function power(P){let left=P;for(const u of U){if(u.power>P/3||u.power<=1)continue;const n=Math.floor(left*0.45/u.power);if(n>0){s[u.field]=(s[u.field]||0)+n;left-=n*u.power;}}s.soldiers+=left;}
function equip(ids,level){for(const id of ids)s.equipment[id]={level,count:1,deployed:true};}
function fac(ids,level){s.facilities=[...ids];s.facilityLevels=Object.fromEntries(ids.map(i=>[i,level]));}
`;
export const stages = {
  early: helpers + `power(12);s.gold=1840;`,
  mid: helpers + `power(7400);s.gold=2_384_000;s.ncoSchoolLevel=5;s.officerSchoolLevel=1;s.campaignCleared=14;s.campaignStars.fill(3,0,14);
    equip(['artillery','tank','selfPropelled'],12);fac(['kitchen','gym','futsal','pcRoom','infirmary'],8);`,
  late: helpers + `power(120_000_000);s.gold=88_000_000_000;s.ncoSchoolLevel=5;s.officerSchoolLevel=5;s.advancedSchoolLevel=5;s.commandSchoolLevel=3;s.campaignCleared=96;s.campaignStars.fill(3,0,96);s.fieldTheme='concrete';
    equip(['artillery','tank','selfPropelled','helicopter','rocketLauncher','transport','fighter','railgunTank','icbm'],28);
    fac(['kitchen','gym','futsal','pcRoom','infirmary','range','workshop','depot','comms','operations','research','logistics'],15);
    for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=20;`,
  galaxy: helpers + `power(12_000_000_000);s.gold=4_200_000_000_000_000n;s.ncoSchoolLevel=5;s.officerSchoolLevel=5;s.advancedSchoolLevel=5;s.commandSchoolLevel=5;s.galacticSchoolLevel=2;s.campaignCleared=162;s.campaignStars.fill(3,0,162);
    equip(Object.keys(s.equipment),36);
    fac(['kitchen','gym','futsal','pcRoom','infirmary','range','workshop','depot','comms','operations','research','logistics','simulation','strategy','spaceport','orbital'],20);
    for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=30;`,
};
