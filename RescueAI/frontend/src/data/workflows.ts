// Structured presentation checklists. Status: drafted by developers from general
// emergency-medicine knowledge; not an approved protocol (see checklist_status string).
import type { L3 } from "./flags";

export interface Workflow {
  id: string;
  title: L3;
  flags: string[];
  questions: string[];
  neuro?: boolean;
  topic: string;
}

export const QUESTIONS: Record<string, L3> = {
  onset_sudden: { ru: "Начало внезапное", kk: "Кенеттен басталды", en: "Sudden onset" },
  radiation: { ru: "Иррадиация боли (рука, челюсть, спина)", kk: "Ауырсынудың таралуы (қол, жақ, арқа)", en: "Pain radiation (arm, jaw, back)" },
  sweating_nausea: { ru: "Потливость, тошнота", kk: "Терлеу, жүрек айну", en: "Sweating, nausea" },
  cardiac_history: { ru: "Сердечный анамнез", kk: "Жүрек ауруы анамнезі", en: "Cardiac history" },
  fever: { ru: "Лихорадка", kk: "Қызба", en: "Fever" },
  cough: { ru: "Кашель / мокрота", kk: "Жөтел / қақырық", en: "Cough / sputum" },
  asthma_copd: { ru: "Астма / ХОБЛ в анамнезе", kk: "Демікпе / ӨСОА анамнезі", en: "Asthma / COPD history" },
  leg_swelling: { ru: "Отёк одной ноги", kk: "Бір аяқтың ісінуі", en: "One-sided leg swelling" },
  trauma: { ru: "Была травма", kk: "Жарақат болды", en: "Trauma occurred" },
  witnessed: { ru: "Есть свидетели события", kk: "Оқиғаның куәгерлері бар", en: "Event witnessed" },
  incontinence_tongue: { ru: "Недержание / прикус языка", kk: "Ұстамау / тілді тістеу", en: "Incontinence / tongue bite" },
  diabetes: { ru: "Сахарный диабет", kk: "Қант диабеті", en: "Diabetes" },
  alcohol_drugs: { ru: "Алкоголь / вещества", kk: "Алкоголь / заттар", en: "Alcohol / substances" },
  anticoagulants: { ru: "Антикоагулянты", kk: "Антикоагулянттар", en: "Anticoagulants" },
  vomiting: { ru: "Рвота", kk: "Құсу", en: "Vomiting" },
  pregnancy_possible: { ru: "Возможна беременность", kk: "Жүктілік болуы мүмкін", en: "Pregnancy possible" },
  gi_bleeding: { ru: "Кровь в рвоте / стуле", kk: "Құсықта / нәжісте қан", en: "Blood in vomit / stool" },
  allergen_known: { ru: "Известный контакт с аллергеном", kk: "Аллергенмен белгілі байланыс", en: "Known allergen exposure" },
  new_medication: { ru: "Новый препарат недавно", kk: "Жақында жаңа дәрі", en: "New medication recently" },
  neck_stiffness: { ru: "Ригидность затылочных мышц", kk: "Желке бұлшықеттерінің сіреспесі", en: "Neck stiffness" },
  confusion: { ru: "Спутанность", kk: "Сананың шатасуы", en: "Confusion" },
  substance_known: { ru: "Известно вещество и время", kk: "Зат пен уақыт белгілі", en: "Substance and time known" },
  mechanism_high: { ru: "Высокоэнергетический механизм", kk: "Жоғары энергиялы механизм", en: "High-energy mechanism" },
  burn_area_estimated: { ru: "Площадь ожога оценена", kk: "Күйік аумағы бағаланды", en: "Burn area estimated" },
  closed_space_fire: { ru: "Пожар в закрытом помещении", kk: "Жабық бөлмедегі өрт", en: "Closed-space fire" },
  palpitations_ongoing: { ru: "Сердцебиение продолжается", kk: "Жүрек қағуы жалғасуда", en: "Palpitations ongoing" },
  worst_headache: { ru: "Самая сильная боль в жизни", kk: "Өмірдегі ең қатты ауырсыну", en: "Worst headache ever" },
  seizure_first: { ru: "Первый судорожный приступ", kk: "Алғашқы құрысу ұстамасы", en: "First seizure" },
  pupils_unequal: { ru: "Зрачки неравные", kk: "Қарашықтар тең емес", en: "Unequal pupils" },
  loss_consciousness_after_injury: { ru: "Потеря сознания после травмы", kk: "Жарақаттан кейін есінен тану", en: "Loss of consciousness after injury" },
};

const t = (ru: string, kk: string, en: string): L3 => ({ ru, kk, en });

export const WORKFLOWS: Workflow[] = [
  { id: "chest_pain", title: t("Боль в груди", "Кеуде ауыруы", "Chest pain"), topic: "acs",
    flags: ["chest_pain_ongoing", "collapse", "severe_breathing_difficulty", "syncope_with_exertion_or_chest_pain"],
    questions: ["onset_sudden", "radiation", "sweating_nausea", "cardiac_history", "leg_swelling"] },
  { id: "dyspnea", title: t("Одышка", "Ентігу", "Shortness of breath"), topic: "triage",
    flags: ["severe_breathing_difficulty", "airway_obstruction", "wheeze_stridor", "throat_tongue_swelling"],
    questions: ["onset_sudden", "fever", "cough", "asthma_copd", "leg_swelling", "cardiac_history"] },
  { id: "loss_of_consciousness", title: t("Потеря сознания", "Есінен тану", "Loss of consciousness"), topic: "resuscitation",
    flags: ["unresponsive", "not_breathing_normally", "seizure_ongoing"],
    questions: ["witnessed", "trauma", "diabetes", "alcohol_drugs", "anticoagulants"] },
  { id: "syncope", title: t("Обморок", "Талу", "Syncope"), topic: "triage",
    flags: ["syncope_with_exertion_or_chest_pain", "chest_pain_ongoing"],
    questions: ["witnessed", "incontinence_tongue", "cardiac_history", "palpitations_ongoing", "gi_bleeding", "pregnancy_possible"] },
  { id: "altered_mental_status", title: t("Нарушение сознания / поведения", "Сана / мінез-құлық бұзылысы", "Altered mental status"), topic: "triage",
    flags: ["unresponsive", "seizure_ongoing", "suspected_poisoning"],
    questions: ["diabetes", "fever", "neck_stiffness", "alcohol_drugs", "trauma", "anticoagulants"] },
  { id: "stroke_like", title: t("Инсультоподобные симптомы", "Инсультке ұқсас белгілер", "Stroke-like symptoms"), topic: "triage", neuro: true,
    flags: ["facial_droop", "arm_leg_weakness_one_side", "speech_disturbance", "sudden_vision_loss", "sudden_balance_loss"],
    questions: ["onset_sudden", "anticoagulants", "diabetes", "seizure_first", "trauma"] },
  { id: "seizure", title: t("Судороги", "Құрысулар", "Seizures"), topic: "triage", neuro: true,
    flags: ["seizure_ongoing", "not_breathing_normally"],
    questions: ["seizure_first", "fever", "trauma", "diabetes", "alcohol_drugs", "pregnancy_possible"] },
  { id: "head_injury", title: t("Травма головы", "Бас жарақаты", "Head injury"), topic: "trauma", neuro: true,
    flags: ["head_injury_on_anticoagulant", "unresponsive", "seizure_ongoing"],
    questions: ["loss_consciousness_after_injury", "vomiting", "pupils_unequal", "anticoagulants", "alcohol_drugs", "mechanism_high"] },
  { id: "abdominal_pain", title: t("Боль в животе", "Іш ауыруы", "Abdominal pain"), topic: "triage",
    flags: ["collapse", "dizziness_hypotension_signs"],
    questions: ["onset_sudden", "vomiting", "gi_bleeding", "fever", "pregnancy_possible", "trauma"] },
  { id: "allergic_reaction", title: t("Острая аллергическая реакция", "Жедел аллергиялық реакция", "Acute allergic reaction"), topic: "anaphylaxis",
    flags: ["throat_tongue_swelling", "wheeze_stridor", "severe_breathing_difficulty", "dizziness_hypotension_signs", "lip_face_swelling", "collapse"],
    questions: ["allergen_known", "new_medication", "onset_sudden", "asthma_copd"] },
  { id: "fever", title: t("Лихорадка", "Қызба", "Fever"), topic: "triage",
    flags: ["non_blanching_rash_with_fever", "severe_breathing_difficulty"],
    questions: ["neck_stiffness", "confusion", "cough", "vomiting"] },
  { id: "infection", title: t("Подозрение на инфекцию / сепсис", "Инфекция / сепсис күдігі", "Suspected infection / sepsis"), topic: "triage",
    flags: ["non_blanching_rash_with_fever", "rapidly_spreading_painful", "collapse"],
    questions: ["fever", "confusion", "cough", "diabetes"] },
  { id: "glucose", title: t("Гипо- / гипергликемия", "Гипо- / гипергликемия", "Hypo- / hyperglycaemia"), topic: "triage",
    flags: ["unresponsive", "seizure_ongoing"],
    questions: ["diabetes", "vomiting", "confusion", "alcohol_drugs"] },
  { id: "poisoning", title: t("Отравление", "Улану", "Poisoning"), topic: "triage",
    flags: ["suspected_poisoning", "unresponsive", "not_breathing_normally", "seizure_ongoing"],
    questions: ["substance_known", "alcohol_drugs", "vomiting", "confusion"] },
  { id: "trauma", title: t("Травма", "Жарақат", "Trauma"), topic: "trauma",
    flags: ["uncontrolled_bleeding", "airway_obstruction", "severe_breathing_difficulty", "collapse", "possible_open_fracture"],
    questions: ["mechanism_high", "anticoagulants", "loss_consciousness_after_injury", "pregnancy_possible"] },
  { id: "burns", title: t("Ожоги", "Күйіктер", "Burns"), topic: "burn",
    flags: ["airway_burn_signs", "large_or_critical_area_burn", "severe_breathing_difficulty"],
    questions: ["closed_space_fire", "burn_area_estimated", "trauma"] },
  { id: "acute_weakness", title: t("Острая слабость", "Жедел әлсіздік", "Acute weakness"), topic: "triage", neuro: true,
    flags: ["arm_leg_weakness_one_side", "facial_droop", "speech_disturbance", "severe_breathing_difficulty"],
    questions: ["onset_sudden", "diabetes", "fever", "vomiting"] },
  { id: "palpitations", title: t("Сердцебиение", "Жүрек қағуы", "Palpitations"), topic: "arrhythmia",
    flags: ["chest_pain_ongoing", "syncope_with_exertion_or_chest_pain", "dizziness_hypotension_signs", "severe_breathing_difficulty"],
    questions: ["palpitations_ongoing", "onset_sudden", "cardiac_history"] },
  { id: "severe_headache", title: t("Сильная головная боль", "Қатты бас ауруы", "Severe headache"), topic: "triage", neuro: true,
    flags: ["thunderclap_headache", "speech_disturbance", "arm_leg_weakness_one_side", "seizure_ongoing"],
    questions: ["worst_headache", "neck_stiffness", "fever", "trauma", "anticoagulants", "pregnancy_possible"] },
];

export const IMAGE_TASK_FLAGS: Record<string, string[]> = {
  ecg: ["unresponsive", "not_breathing_normally", "collapse", "chest_pain_ongoing", "syncope_with_exertion_or_chest_pain", "severe_breathing_difficulty"],
  skin: ["throat_tongue_swelling", "wheeze_stridor", "severe_breathing_difficulty", "dizziness_hypotension_signs", "collapse", "lip_face_swelling", "mucosal_involvement", "skin_blistering_peeling", "non_blanching_rash_with_fever", "rapidly_spreading_painful"],
  wound: ["uncontrolled_bleeding", "distal_circulation_compromised", "distal_numbness_weakness", "exposed_bone_tendon", "possible_open_fracture", "crush_injury", "embedded_object", "high_risk_bite", "large_or_critical_area_burn", "airway_burn_signs", "rapidly_spreading_painful"],
};

export const IMAGE_TASK_QUESTIONS: Record<string, Record<string, L3>> = {
  ecg: {
    chest_pain: t("Боль в груди", "Кеуде ауыруы", "Chest pain"),
    palpitations: t("Сердцебиение", "Жүрек қағуы", "Palpitations"),
    syncope: t("Обморок", "Талу", "Syncope"),
    pacemaker: t("Кардиостимулятор", "Кардиостимулятор", "Pacemaker"),
    kidney_disease: t("Болезнь почек", "Бүйрек ауруы", "Kidney disease"),
  },
  skin: {
    itching: t("Зуд", "Қышу", "Itching"), pain: t("Боль", "Ауырсыну", "Pain"), fever: t("Лихорадка", "Қызба", "Fever"),
    swelling: t("Отёк", "Ісіну", "Swelling"), new_medication: t("Новый препарат", "Жаңа дәрі", "New medication"),
    known_allergy: t("Известная аллергия", "Белгілі аллергия", "Known allergy"),
    lesions_move: t("Элементы меняют место", "Элементтер орнын ауыстырады", "Lesions change location"),
    lesions_transient: t("Элементы исчезают < 24 ч", "Элементтер < 24 сағатта жоғалады", "Lesions fade < 24 h"),
    blanching: t("Бледнеет при надавливании", "Басқанда бозарады", "Blanches on pressure"),
    spreading: t("Распространяется", "Таралуда", "Spreading"),
  },
  wound: {
    bleeding_controlled: t("Кровотечение остановлено", "Қан кету тоқтатылды", "Bleeding controlled"),
    contaminated: t("Загрязнена", "Ластанған", "Contaminated"),
    foreign_body_possible: t("Возможно инородное тело", "Бөгде зат болуы мүмкін", "Possible foreign body"),
    sensation_normal: t("Чувствительность сохранена", "Сезімталдық сақталған", "Sensation intact"),
    movement_normal: t("Движения сохранены", "Қозғалыс сақталған", "Movement intact"),
    tetanus_up_to_date: t("Прививка от столбняка актуальна", "Сіреспеге қарсы екпе өзекті", "Tetanus vaccination up to date"),
    anticoagulants: t("Антикоагулянты", "Антикоагулянттар", "Anticoagulants"),
  },
};
