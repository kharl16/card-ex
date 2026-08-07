// Blocklist of common disposable / throwaway email domains.
export const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "0-mail.com","10minutemail.com","10minutemail.net","20minutemail.com","33mail.com",
  "anonbox.net","anonymbox.com","armyspy.com","binkmail.com","bobmail.info","bugmenot.com",
  "burnermail.io","byom.de","cock.li","cuvox.de","dayrep.com","discard.email","discardmail.com",
  "disposable.com","disposableinbox.com","dispostable.com","dodgit.com","dropmail.me",
  "e4ward.com","email-fake.com","emailfake.com","emailondeck.com","emailtemporanea.com",
  "emailtemporario.com.br","emkei.cz","fakeinbox.com","fakemail.net","fakemailgenerator.com",
  "fleckens.hu","gettempmail.com","getairmail.com","getnada.com","grr.la","guerrillamail.biz",
  "guerrillamail.com","guerrillamail.de","guerrillamail.info","guerrillamail.net",
  "guerrillamail.org","guerrillamailblock.com","harakirimail.com","inboxalias.com",
  "inboxbear.com","incognitomail.com","jetable.org","koszmail.pl","kurzepost.de",
  "linshiyouxiang.net","luxusmail.org","mail-temporaire.fr","mail7.io","mailbox52.ga",
  "mailcatch.com","maildrop.cc","maildu.de","mailexpire.com","mailforspam.com","mailfreeonline.com",
  "mailinator.com","mailinator.net","mailismagic.com","mailnesia.com","mailnull.com",
  "mailsac.com","mailtemp.info","mailtothis.com","mintemail.com","mohmal.com","moakt.com",
  "mt2015.com","mytemp.email","mytempemail.com","nada.email","no-spam.ws","nowmymail.com",
  "objectmail.com","onetimeemail.com","opayq.com","pokemail.net","proxymail.eu","put2.net",
  "rhyta.com","rmqkr.net","sharklasers.com","shitmail.me","sneakemail.com","spam4.me",
  "spambog.com","spambox.us","spamdecoy.net","spamfree24.org","spamgourmet.com","spamherelots.com",
  "spamhole.com","spammotel.com","spamspot.com","superrito.com","teleworm.us","temp-mail.io",
  "temp-mail.org","tempail.com","tempemail.co","tempemail.com","tempinbox.com","tempmail.de",
  "tempmail.net","tempmail.plus","tempmailaddress.com","tempmailo.com","tempr.email",
  "thankyou2010.com","throwawaymail.com","tmail.ws","tmailinator.com","trashmail.com",
  "trashmail.de","trashmail.me","trashmail.net","trbvm.com","tuta.io","vomoto.com",
  "wegwerfmail.de","wegwerfmail.net","wegwerfmail.org","yopmail.com","yopmail.fr","yopmail.net",
  "zetmail.com","zippymail.info",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  // Also block subdomains of blocked domains (e.g. mail.yopmail.com)
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    if (DISPOSABLE_EMAIL_DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  return false;
}
