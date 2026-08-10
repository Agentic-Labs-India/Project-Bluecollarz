"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    id: "sign-in",
    question: "How do I create a candidate account?",
    answer:
      "Sign in with Google. New accounts start as candidates (work) by default — no separate signup form. After you land in your workspace, complete AI voice onboarding so your profile is ready for roles.",
  },
  {
    id: "onboarding",
    question: "What happens during AI onboarding?",
    answer:
      "You talk through your experience, skills, and preferences. Blucollarz turns that into a structured profile that recruiters can review — so you are not stuck rewriting the same resume for every job.",
  },
  {
    id: "roles",
    question: "How do I find and apply to roles?",
    answer:
      "Browse published openings on the site or inside your candidate home. When you apply, your profile and interview signal travel with you — no repetitive paperwork for each application.",
  },
  {
    id: "interviews",
    question: "What are AI interviews and do I need them?",
    answer:
      "Communication and domain interviews help you show how you speak and work in your trade. Scores, summaries, and recordings give recruiters clearer evidence than a resume alone. Completing them strengthens your applications.",
  },
  {
    id: "selection",
    question: "When do I verify my identity?",
    answer:
      "Identity checks kick in after a recruiter selects you. DigiLocker and document verification confirm who you are before medical and visa steps — so your details stay protected until there is a real hire path.",
  },
  {
    id: "medical-visa",
    question: "Does Blucollarz handle medical and visa steps?",
    answer:
      "We guide you through medical clearance with approved lab partners and help move verified documents into visa processing. Final medical and visa decisions still sit with the labs, authorities, and hiring company.",
  },
  {
    id: "cost",
    question: "Is it free for candidates to use Blucollarz?",
    answer:
      "Creating an account, building your profile, exploring roles, and completing AI interviews are part of the candidate experience on the platform. If any paid step appears later in your journey, it will be shown clearly before you continue.",
  },
  {
    id: "countries",
    question: "Which countries can I work toward?",
    answer:
      "Blucollarz focuses on cross-border opportunities for skilled workers — corridors like the UAE, Gulf, Singapore, Korea, the UK, USA, and more, depending on open roles. Always check each job’s location and requirements before you apply.",
  },
] as const;

export function LandingFaqs() {
  return (
    <section
      aria-labelledby="candidate-faqs-heading"
      className="relative mt-16 py-10 sm:mt-20 sm:py-14 md:mt-24"
    >
      <div className="w-full">
        <div className="max-w-2xl">
          <p className="text-mute text-[11px] font-medium tracking-[0.14em] uppercase sm:text-xs">
            Candidate FAQs
          </p>
          <h2
            id="candidate-faqs-heading"
            className="font-heading text-foreground mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl"
          >
            Questions before you start
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed sm:text-[15px]">
            Straight answers for workers using Blucollarz — from sign-in to visa
            gates.
          </p>
        </div>

        <Accordion
          type="single"
          defaultValue={["sign-in"]}
          className="border-border mt-8 divide-border border-t border-b sm:mt-10"
        >
          {FAQS.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="text-foreground py-4 text-[15px] font-medium tracking-tight hover:no-underline sm:text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground max-w-3xl pb-4 text-sm leading-relaxed sm:text-[15px]">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
