// i18n.js — UI string dictionary (English / Chichewa)
// t(key) renders a span with data-en / data-ny so the client toggle swaps text.

const DICT = {
  // nav / general
  'nav.tagline': ['The truth before you buy', 'Zoona usanagule'],
  'nav.check': ['Check a Business', 'Fufuzani Bizinesi'],
  'nav.browse': ['Browse', 'Yang\'anani'],
  'nav.add': ['Add a Business', 'Wonjezerani Bizinesi'],
  'nav.login': ['Log in', 'Lowani'],
  'nav.signup': ['Sign up', 'Yambani Akaunti'],
  'nav.logout': ['Log out', 'Tulukani'],
  'nav.account': ['My Account', 'Akaunti Yanga'],
  'nav.admin': ['Admin', 'Admin'],
  'common.continue': ['Continue', 'Pitirizani'],
  'common.cancel': ['Cancel', 'Kanizani'],
  'common.back': ['Back', 'Bwererani'],
  'common.save': ['Save', 'Sungani'],
  'common.search': ['Search', 'Fufuzani'],
  'common.loading': ['Checking...', 'Kufufuza...'],

  // home
  'home.h1a': ['Never get scammed again.', "Osabendedwa Nsomba M'chikwama."],
  'home.h1b': ["Know who's legit before you pay.", 'Dziwani Wodalirika Usanalipire.'],
  'home.lead': ['The independent review platform for African businesses. Check real buyer ratings, read honest reviews, and deal only with verified sellers.', 'Nsanja yodziyimira payokha yosonkhanitsa ndemanga za mabizinesi a ku Africa. Onani ma reiting a ogula enieni, werengani ndemanga zowona, ndipo gulani kwa ogulitsa otsimikizika.'],
  'home.searchLabel': ['Check a business', 'Fufuzani bizinesi'],
  'home.freeNote': ['Free for buyers. Always.', 'Zaulere kwa wogula. Kwalakwalake.'],
  'home.topRated': ['Top rated businesses', 'Mabizinesi apamwamba'],
  'home.topRatedSub': ['Sorted by rating and review count.', 'Odasulidwa ndi reiting ndi chiwerengero cha ndemanga.'],
  'home.viewProfile': ['View profile', 'Onani profaile'],
  'home.howKicker': ['How it works', 'Zochitika'],
  'home.howTitle': ['Three steps to safer buying', 'Magawo atatu ogulira motetezeka'],
  'home.howSub': ['Built for how people across Africa buy and sell online.', 'Yopangidwa mmene anthu a ku Africa amagulira ndi amagulitsa pa intaneti.'],
  'home.step1t': ['Search the seller', 'Fufuzani Wogulitsa'],
  'home.step1b': ['Look up any business by name, category, or city before you pay.', 'Fufuzani bizinesi iliyonse ndi dzina, gulu, kapena mzinda usanalipire.'],
  'home.step2t': ['Read real reviews', 'Werengani Ndemanga Zowona'],
  'home.step2b': ['See honest feedback and star ratings from real verified buyers.', 'Onani maganizo owona ndi nyenyezi zapatsidwa a ogula enieni.'],
  'home.step3t': ['Buy with confidence', 'Gula Ali ndi Chidaliro'],
  'home.step3b': ['Deal safely with Verified sellers or leave your own review.', 'Gulani motetezeka kwa ogulitsa otsimikizika kapena siyani ndemanga yanu.'],
  'home.bizKicker': ['For businesses', 'Kwa mabizinesi'],
  'home.bizTitle': ['Own a business? Your reputation lives here.', 'Muli ndi bizinesi? Mbiri yanu ikukhala kuno.'],
  'home.bizSub': ['Claim your free profile, respond to reviews, and earn the trust of every buyer.', 'Pezani profaile yanu yaulere, yankhani ndemanga, ndipo pezani chidaliro cha wogula aliyense.'],
  'home.biz1t': ['Claim your free profile', 'Pezani profaile yanu yaulere'],
  'home.biz1b': ['Your business gets a public page with ratings, reviews, and your side of the story.', 'Bizinesi yanu imapeza tsamba la pagulu ndi ma reiting, ndemanga, ndi mbiri yanu.'],
  'home.biz2t': ['Respond to reviews', 'Yankhani ndemanga'],
  'home.biz2b': ['Reply to buyers publicly. Businesses that engage build the strongest reputations.', 'Yankhani ogula pagulu. Mabizinesi omwe amayankha amakhala ndi mbiri yamphamvu.'],
  'home.biz3t': ['Earn the Verified Badge', 'Pezani Badge ya Zowona'],
  'home.biz3b': ['Prove you are legit with official ID and real transaction records.', 'Tsimikizirani kuti ndinu okhulupirika ndi ID ya boma ndi umboni wa malipiro enieni.'],
  'home.ctaTitle': ['Every purchase deserves the truth.', 'Gulidwe lililonse likufunika zoona.'],
  'home.ctaSub': ['Join the community making buying safe across Africa.', "Lowani m'mbumba yopangitsa kugula kuti kukhale chitetezo m'Africa yonse."],
  'home.statBusinesses': ['Businesses', 'Mabizinesi'],
  'home.statReviews': ['Buyer reviews', 'Ndemanga za ogula'],
  'home.statVerified': ['Verified sellers', 'Ogulitsa otsimikizika'],

  // search
  'search.results': ['Results', 'Zotsatira'],
  'search.none': ['No businesses found.', 'Palibe mabizinesi apezeka.'],
  'search.noneHint': ['Try a different name, or add this business so buyers can review it.', 'Yesetsani dzina lina, kapena wonjezerani bizinesiyi kuti ogula athe kuyidemanga.'],
  'search.addPrompt': ['Add this business', 'Wonjezerani bizinesiyi'],

  // business page
  'biz.reviews': ['Reviews', 'Ndemanga'],
  'biz.noReviews': ['No reviews yet.', 'Palibe ndemanga.'],
  'biz.beFirst': ['Be the first to review this business.', 'Khala woyamba kudzidemanga bizinesiyi.'],
  'biz.writeReview': ['Write a review', 'Siyani ndemanga'],
  'biz.loginToReview': ['Log in to write a review', 'Lowani kuti musiye ndemanga'],
  'biz.verified': ['Verified', 'Wotsimikizika'],
  'biz.notVerified': ['Not verified yet', 'Sanatsimikizikebe'],
  'biz.verifiedNote': ['Owner identity and transaction records confirmed.', 'Mbiri ya mwini wake ndi malipiro anatsimikizika.'],
  'biz.claim': ['Own this business? Claim it', 'Ndinu mwini? Pezani bizinesiyi'],
  'biz.yourReview': ['Your review', 'Ndemanga yanu'],
  'biz.editReview': ['Update your review', 'Sinthani ndemanga yanu'],
  'biz.distribution': ['Rating breakdown', 'Kugawa kwa ma reiting'],
  'biz.response': ['Response from the business', 'Yankho la bizinesi'],
  'biz.about': ['About', 'Za bizinesi'],
  'biz.website': ['Website', 'Tsamba'],
  'biz.phone': ['Phone', 'Foni'],
  'biz.location': ['Location', 'Malo'],
  'biz.category': ['Category', 'Gulu'],
  'biz.report': ['Report a problem', 'Lavomereza vuto'],

  // review form
  'rev.title': ['Share your experience', 'Gawani zomwe mwazolowera'],
  'rev.rating': ['Your rating', 'Reiting yanu'],
  'rev.name': ['Review headline', 'Mutu wa ndemanga'],
  'rev.namePh': ['e.g. Fast delivery, good quality', 'Zm. Katundu anafika msanga, chitsulo chabwino'],
  'rev.body': ['Your review', 'Ndemanga yanu'],
  'rev.bodyPh': ['Tell other buyers about your experience — delivery, quality, communication.', 'Nenani ogula ena za zomwe mwakumana nazo — katundu, chitsulo, kuyankhana.'],
  'rev.submit': ['Post review', 'Tumizani ndemanga'],
  'rev.rules': ['Reviews are tied to real accounts. One review per business per account.', 'Ndemanga zimalumikizidwa ndi akaunti zenizeni. Ndemanga imodzi pa bizinesi pa akaunti.'],
  'rev.updated': ['Review updated.', 'Ndemanga yasinthidwa.'],
  'rev.posted': ['Review posted. Thank you!', 'Ndemanga yatumizidwa. Zikomo!'],
  'rev.deleted': ['Review deleted.', 'Ndemanga yafutidwa.'],

  // auth
  'auth.signupTitle': ['Create your account', 'Pangani akaunti yanu'],
  'auth.signupSub': ['Free forever for buyers.', 'Zaulere nthawi zonse kwa ogula.'],
  'auth.loginTitle': ['Welcome back', 'Takulandirani'],
  'auth.name': ['Full name', 'Dzina lonse'],
  'auth.email': ['Email', 'Imeyili'],
  'auth.password': ['Password', 'Pasiwodi'],
  'auth.create': ['Create account', 'Pangani akaunti'],
  'auth.enter': ['Log in', 'Lowani'],
  'auth.haveAccount': ['Already have an account? Log in', 'Muli ndi akaunti kale? Lowani'],
  'auth.noAccount': ["Don't have an account? Sign up", 'Mulibe akaunti? Yambani akaunti'],
  'auth.badlogin': ['Wrong email or password.', 'Imeyili kapena pasiwodi yolakwika.'],
  'auth.emailTaken': ['An account with this email already exists.', 'Akaunti ndi imeyiliyi ilipo kale.'],
  'auth.acctCreated': ['Account created. Welcome!', 'Akaunti yapangidwa. Takulandirani!'],

  // add business
  'add.title': ['Add a business', 'Wonjezerani bizinesi'],
  'add.sub': ['Add a business so buyers can find and review it. Anyone can add.', 'Wonjezerani bizinesi kuti ogula azipeze ndi kuyidemanga. Aliyense atha kuwonjezera.'],
  'add.name': ['Business name', 'Dzina la bizinesi'],
  'add.category': ['Category', 'Gulu'],
  'add.city': ['City', 'Mzinda'],
  'add.country': ['Country', 'Dziko'],
  'add.desc': ['Description', 'Mafotokozedwe'],
  'add.descPh': ['What does this business sell or offer?', 'Bizinesiyi imagulitsa chiyani?'],
  'add.website': ['Website (optional)', 'Tsamba (zosiyanasiyana)'],
  'add.phone': ['Phone (optional)', 'Foni (zosiyanasiyana)'],
  'add.submit': ['Add business', 'Wonjezerani bizinesi'],
  'add.exists': ['A business with a similar name already exists.', 'Bizinesi yochuluka ndi dzina limodzi iliapo kale.'],
  'add.added': ['Business added.', 'Bizinesi yonjezedwa.'],

  // claim
  'claim.title': ['Claim your business', 'Pezani bizinesi yanu'],
  'claim.sub': ['Prove you own this business to respond to reviews and earn the Verified Badge.', 'Tsimikizirani kuti ndinu mwini bizinesiyi kuti mukhale ndi mwayo woyankha ndemanga ndi kupeza Badge ya Zowona.'],
  'claim.details': ['Tell us about your business', 'Nenani za bizinesi yanu'],
  'claim.detailsPh': ['e.g. When was it started? What is your role? Any proof you can share?', 'Zm. Inayamba liti? Muli ndi udzuwu wanji? Kodi mungaonetsere umboni?'],
  'claim.contact': ['Best contact for verification', 'Kondanitsani kwa chitsimikizo'],
  'claim.contactPh': ['Phone or email where we can reach you', 'Foni kapena imeyili tikukufikirani'],
  'claim.submit': ['Submit claim', 'Tumizani claim'],
  'claim.sent': ['Claim submitted. We will review it shortly.', 'Claim yatumizidwa. Tikayang\'ana posachedwa.'],
  'claim.pending': ['Claim pending review.', 'Claim ikuyang\'anidwa.'],

  // dashboard
  'dash.title': ['My account', 'Akaunti yanga'],
  'dash.myReviews': ['My reviews', 'Ndemanga zanga'],
  'dash.myBusinesses': ['My businesses', 'Mabizinesi anga'],
  'dash.noReviews': ['You have not written any reviews yet.', 'Sanasiye ndemanga palibe.'],
  'dash.noBusinesses': ['No businesses claimed yet.', 'Palibe mabizinesi opezeka.'],
  'dash.verified': ['Verified', 'Wotsimikizika'],
  'dash.claimed': ['Claimed', 'Wopezedwa'],
  'dash.status': ['Status', 'Mmene'],
  'dash.applyVerify': ['Apply for Verified Badge', 'Pezani Badge ya Zowona'],
  'dash.pendingVerify': ['Verification pending review', 'Chitsimikizo chikuyang\'anidwa'],
  'dash.manage': ['Manage', 'Yang\'anani'],

  // verification
  'ver.title': ['Apply for the Verified Badge', 'Pezani Badge ya Zowona'],
  'ver.sub': ['Verified businesses get a public badge, higher trust, and better placement.', 'Mabizinesi otsimikizika amapeza badge pagulu, chidaliro chapamwamba, ndi malo abwino.'],
  'ver.idType': ['ID type', 'Mtundu wa ID'],
  'ver.idNumber': ['ID number', 'Nambala ya ID'],
  'ver.payMethod': ['Registered payment method', 'Malipiro olembedwa'],
  'ver.payName': ['Name on the payment account', 'Dzina pa akaunti ya malipiro'],
  'ver.notes': ['Anything else we should check (optional)', 'Zina zofunika kuyang\'ana (zosafunika)'],
  'ver.submit': ['Submit application', 'Tumizani application'],
  'ver.sent': ['Application submitted. We will review it and contact you.', 'Application yatumizidwa. Tikayang\'ana ndi kukufikirani.'],

  // owner response
  'resp.title': ['Respond to review', 'Yankhani ndemanga'],
  'resp.submit': ['Post response', 'Tumizani yankho'],
  'resp.posted': ['Response posted.', 'Yankho latumizidwa.'],

  // admin
  'adm.title': ['Admin panel', 'Admin'],
  'adm.verifications': ['Verification requests', 'Ma application a chitsimikizo'],
  'adm.claims': ['Business claims', 'Ma claim'],
  'adm.businesses': ['Businesses', 'Mabizinesi'],
  'adm.reviews': ['Reviews', 'Ndemanga'],
  'adm.approve': ['Approve', 'Apoveni'],
  'adm.reject': ['Reject', 'Kanizani'],
  'adm.hide': ['Hide', 'Bisaniza'],
  'adm.show': ['Unhide', 'Onetsani'],
  'adm.remove': ['Remove', 'Futani'],
  'adm.restore': ['Restore', 'Bwezerani'],
  'adm.none': ['Nothing pending.', 'Palibe choyang\'ana.'],
  'adm.approved': ['Approved.', 'Apoveni.'],
  'adm.rejected': ['Rejected.', 'Kanidwa.'],
  'adm.owner': ['Owner', 'Mwini'],
  'adm.by': ['By', 'Ndani'],
  'fb.title': ['Share your experience', 'Gawani zomwe mwazolowera'],
  'fb.sub': ['Bought from this business? Your feedback helps other buyers shop safely.', 'Mwagula kambali? Ndemanga yanu zithandiza ogula ena kugula motetezeka.'],
  'fb.recommend': ['of buyers recommend this business', 'a ogula amalimbikira bizinesiyi'],
  'fb.noFeedback': ['No feedback yet. Be the first.', 'Palibe ndemanga. Khala woyamba.'],
  'fb.tap': ['Tap a star to rate', 'Dinani nyenyezi kupima'],
  'auth.loginSub': ['Log in to check businesses and post reviews.', 'Lowani kuti mufufuze mabizinesi ndi kutumiza ndemanga.'],
  'auth.trust1': ['Real buyer reviews', 'Ndemanga za ogula enieni'],
  'auth.trust2': ['Verified sellers', 'Ogulitsa otsimikizika'],
  'auth.trust3': ['Free for buyers, always', 'Zaulere kwa ogula, kalakwalake'],
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// t('key') -> <span data-en=".." data-ny="..">..</span>
function t(key) {
  const d = DICT[key];
  if (!d) return key;
  return `<span data-en="${esc(d[0])}" data-ny="${esc(d[1])}">${esc(d[0])}</span>`;
}
// tRaw('key') -> plain English string (for <title>, attributes)
function tRaw(key) {
  const d = DICT[key];
  return d ? d[0] : key;
}

module.exports = { DICT, t, tRaw, esc };
