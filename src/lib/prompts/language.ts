// The UI is English, but the learner writes mostly in Korean. AI drafts are content,
// so they follow the language of the learner's own writing.
export const LANGUAGE_RULE =
  "- Write in the same language as the learner's notes and reflection (if mixed, use the dominant one; Korean if unclear). Keep technical terms as the learner wrote them.";

/** For content with no learner writing to mirror (e.g. web pages): the learner's main language. */
export const LEARNER_LANGUAGE_RULE =
  "- Write in Korean (the learner's main language), even if the page is in another language. Keep proper nouns and technical terms in their original form.";
