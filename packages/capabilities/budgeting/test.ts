import * as rrulePkg from 'rrule'; const RRule = (rrulePkg as any).RRule || (rrulePkg as any).default?.RRule; console.log(!!RRule);
