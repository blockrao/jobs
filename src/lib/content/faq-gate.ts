/**
 * FAQ gate (SEM-001): no validated answer, no FAQ.
 *
 * Each core FAQ is tied to exactly one semantic field. It is emitted only when
 * that field passes its validator, and its answer is built from that field
 * alone. The visible FAQ list and the FAQPage JSON-LD are both produced from
 * the list returned here, so they can never disagree.
 */
import { formatDate, vacanciesPhrase } from "@/lib/labels";
import { noticeSubject } from "@/lib/content/notice-faqs";
import {
  validateEligibility,
  validateFee,
  validateLastDate,
  validateVacancies,
} from "@/lib/semantic-fields";

export type Faq = { question: string; answer: string };

export type CoreFaqInput = {
  isHi: boolean;
  displayTitle: string;
  displayOrgName: string;
  displayEligibility: string | null;
  postNames: string[] | null;
  totalVacancies: number | null;
  validThrough: Date | string | null;
  datePosted: Date | string | null;
  currentStage: string | null;
  applicationFeeGeneral: number | null;
  applicationFeeReserved: number | null;
  extraFaqs?: Array<{ q: string; a: string; qHi?: string; aHi?: string }> | null;
};

export function buildCoreFaqs(i: CoreFaqInput): Faq[] {
  const faqs: Faq[] = [];
  const names = (i.postNames ?? []).map((n) => (n ?? "").trim()).filter(Boolean);
  const multiPost = names.length > 1;
  // One named post: ask about the post (PQ-004). Several posts: the figures below
  // belong to the whole notice, so the question names the notice, never the first post.
  const t = i.isHi ? i.displayTitle : names.length === 1 ? names[0] : i.displayTitle;
  const noticeName = noticeSubject({ title: i.displayTitle, org: i.displayOrgName });

  const vac = validateVacancies(i.totalVacancies);
  if (vac != null) {
    if (i.isHi) {
      faqs.push({
        question: `${t} में कितनी रिक्तियां हैं?`,
        answer: `${i.displayOrgName} द्वारा घोषित ${t} में ${vac} रिक्तियां हैं।`,
      });
    } else if (multiPost) {
      faqs.push({
        question: `How many vacancies are there in ${noticeName}?`,
        answer: `${i.displayOrgName} has announced ${vacanciesPhrase(vac)} in this notice, across ${names.length} posts.`,
      });
    } else {
      faqs.push({
        question: `How many vacancies are there for ${t} at ${i.displayOrgName}?`,
        answer: `${i.displayOrgName} has announced ${vacanciesPhrase(vac)} for ${t}.`,
      });
    }
  }

  // Eligibility: the answer is the stored text only if it is a genuine qualification.
  const elig = validateEligibility(i.displayEligibility);
  if (elig.ok) {
    const eligSubject = multiPost && !i.isHi ? noticeName : t;
    faqs.push(
      i.isHi
        ? { question: `${t} के लिए पात्रता क्या है?`, answer: elig.value }
        : { question: `What is the eligibility for ${eligSubject}?`, answer: elig.value },
    );
  }

  const applicationOpen = i.currentStage === "APPLICATION_OPEN" || i.currentStage === "NOTIFICATION_OUT";
  const last = validateLastDate({ posted: i.datePosted, last: i.validThrough, applicationOpen });
  if (last) {
    const dateStr = formatDate(last, i.isHi ? "hi-IN" : "en-IN");
    faqs.push(
      i.isHi
        ? {
            question: `${t} हेतु आवेदन की अंतिम तिथि क्या है?`,
            answer: `आवेदन की अंतिम तिथि ${dateStr} है। आवेदन करने से पहले सदैव आधिकारिक अधिसूचना से पुष्टि करें।`,
          }
        : {
            question: `What is the last date to apply for ${multiPost ? noticeName : t}?`,
            answer: `The last date to apply is ${dateStr}. Always confirm on the official notification before the deadline.`,
          },
    );
  }

  // Fee: stated only for values that pass; the reserved fee only alongside a valid general fee.
  const fee = validateFee(i.applicationFeeGeneral, i.applicationFeeReserved);
  if (fee.general != null) {
    faqs.push(
      i.isHi
        ? {
            question: `${t} हेतु आवेदन शुल्क क्या है?`,
            answer: `सामान्य श्रेणी हेतु आवेदन शुल्क ₹${fee.general} है${
              fee.reserved != null ? ` तथा आरक्षित श्रेणियों हेतु ₹${fee.reserved}` : ""
            }।`,
          }
        : {
            question: `What is the application fee for ${multiPost ? noticeName : t}?`,
            answer: `The application fee is ₹${fee.general} for general category${
              fee.reserved != null ? ` and ₹${fee.reserved} for reserved categories` : ""
            }.`,
          },
    );
  }

  // Curated FAQs stored with the posting: only complete question/answer pairs.
  for (const f of i.extraFaqs ?? []) {
    const question = i.isHi && f.qHi ? f.qHi : f.q;
    const answer = i.isHi && f.aHi ? f.aHi : f.a;
    if (question?.trim() && answer?.trim() && !faqs.some((x) => x.question === question)) {
      faqs.push({ question, answer });
    }
  }
  return faqs;
}
