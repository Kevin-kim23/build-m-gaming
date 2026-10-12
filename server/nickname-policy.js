// Reviewable draft within the categories chosen by the owner. This is not a
// complete language classifier; uncertain names are handled by private reports.
export const NICKNAME_POLICY_DRAFT = Object.freeze({
  impersonation: ['운영자','관리자','동람코','admin','moderator','gamemaster','dongramco'],
  abuse: ['씨발','씨빨','개새끼','씹새끼','병신','좆','motherfucker','fuck','cunt'],
  hate: ['한남충','한녀충','김치녀','맘충','짱깨','깜둥이','nigger'],
  sexual: ['강간','성폭행','포르노','섹스','야동'],
});

// Exact, reviewed English words whose innocent substrings caused false positives.
// Exempt only this fragment inside a whole ASCII-letter token, never the nickname
// or another prohibited term. Keep underscores until after token recognition so
// an inserted separator cannot manufacture an exception (e.g. bad_minton).
const EMBEDDED_FRAGMENT_EXCEPTIONS = Object.freeze({
  admin: Object.freeze(['badminton']),
  cunt: Object.freeze(['scunthorpe']),
});

function includesProhibitedFragment(normalized, fragment) {
  const exceptions=EMBEDDED_FRAGMENT_EXCEPTIONS[fragment];
  const comparable=exceptions
    ?normalized.replace(/[a-z]+/g,word=>exceptions.includes(word)?word.replaceAll(fragment,'.'):word)
    :normalized;
  return comparable.replaceAll('_','').includes(fragment);
}

export function nicknamePolicyViolation(value) {
  const normalized=value.normalize('NFKC').toLocaleLowerCase('en-US');
  const compact=normalized.replaceAll('_','');
  if(NICKNAME_POLICY_DRAFT.impersonation.some(word=>includesProhibitedFragment(normalized,word))||/^gm\d*$/.test(compact))return 'reserved-nickname';
  for(const category of ['abuse','hate','sexual']){
    if(NICKNAME_POLICY_DRAFT[category].some(word=>includesProhibitedFragment(normalized,word)))return 'prohibited-nickname';
  }
  // Korean domestic phone-number forms. NFKC also folds full-width digits.
  // The structural nickname rule already excludes email separators and URLs.
  if(/(?:01[016789]\d{7,8}|02\d{7,8}|0[3-6]\d{8,9}|821[016789]\d{7,8})/.test(compact))return 'prohibited-nickname';
  return null;
}
