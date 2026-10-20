// Labels for danger-sign codes defined in shared/triage_rules.json.
export type L3 = { ru: string; kk: string; en: string };

export const FLAG_LABELS: Record<string, L3> = {
  unresponsive: { ru: "Не реагирует", kk: "Ешнәрсеге жауап бермейді", en: "Unresponsive" },
  not_breathing_normally: { ru: "Нет нормального дыхания", kk: "Қалыпты тыныс жоқ", en: "Not breathing normally" },
  airway_obstruction: { ru: "Обструкция дыхательных путей", kk: "Тыныс жолдарының бітелуі", en: "Airway obstruction" },
  severe_breathing_difficulty: { ru: "Выраженное затруднение дыхания", kk: "Тыныс алудың айқын қиындауы", en: "Severe breathing difficulty" },
  collapse: { ru: "Коллапс / потеря сознания", kk: "Коллапс / есінен тану", en: "Collapse / loss of consciousness" },
  uncontrolled_bleeding: { ru: "Неконтролируемое кровотечение", kk: "Тоқтамайтын қан кету", en: "Uncontrolled bleeding" },
  seizure_ongoing: { ru: "Продолжающиеся судороги", kk: "Жалғасып жатқан құрысулар", en: "Ongoing seizure" },
  chest_pain_ongoing: { ru: "Продолжающаяся боль в груди", kk: "Жалғасып жатқан кеуде ауыруы", en: "Ongoing chest pain" },
  throat_tongue_swelling: { ru: "Отёк языка или горла", kk: "Тілдің немесе тамақтың ісінуі", en: "Tongue or throat swelling" },
  lip_face_swelling: { ru: "Отёк губ или лица", kk: "Ерін немесе беттің ісінуі", en: "Lip or face swelling" },
  wheeze_stridor: { ru: "Свистящее дыхание / стридор", kk: "Ысқырықты тыныс / стридор", en: "Wheeze / stridor" },
  dizziness_hypotension_signs: { ru: "Головокружение, слабость, признаки гипотонии", kk: "Бас айналу, әлсіздік, гипотония белгілері", en: "Dizziness, weakness, signs of hypotension" },
  mucosal_involvement: { ru: "Поражение слизистых (рот, глаза, гениталии)", kk: "Шырышты қабықтардың зақымдануы (ауыз, көз, жыныс)", en: "Mucosal involvement (mouth, eyes, genitals)" },
  skin_blistering_peeling: { ru: "Пузыри или отслойка кожи", kk: "Тері көпіршіктері немесе сыдырылуы", en: "Skin blistering or peeling" },
  non_blanching_rash_with_fever: { ru: "Непроходящая при надавливании сыпь + лихорадка", kk: "Басқанда жоғалмайтын бөртпе + қызба", en: "Non-blanching rash with fever" },
  rapidly_spreading_painful: { ru: "Быстро распространяющееся болезненное поражение", kk: "Тез таралатын ауыр зақымдану", en: "Rapidly spreading painful lesion" },
  exposed_bone_tendon: { ru: "Видна кость или сухожилие", kk: "Сүйек немесе сіңір көрінеді", en: "Exposed bone or tendon" },
  distal_circulation_compromised: { ru: "Дистальнее раны: холодно, бледно, нет пульса", kk: "Жарадан төмен: суық, бозғылт, тамыр соғуы жоқ", en: "Distal to wound: cold, pale or pulseless" },
  distal_numbness_weakness: { ru: "Онемение или слабость дистальнее раны", kk: "Жарадан төмен ұю немесе әлсіздік", en: "Numbness or weakness distal to wound" },
  crush_injury: { ru: "Синдром длительного сдавления / размозжение", kk: "Ұзақ қысылу / езілу", en: "Crush injury" },
  embedded_object: { ru: "Инородное тело в ране (не извлекать)", kk: "Жарадағы бөгде зат (шығармаңыз)", en: "Embedded object (do not remove)" },
  high_risk_bite: { ru: "Укус высокого риска (человек, животное, кисть, лицо)", kk: "Жоғары қауіпті тістеу (адам, жануар, қол, бет)", en: "High-risk bite (human, animal, hand, face)" },
  large_or_critical_area_burn: { ru: "Обширный ожог или ожог лица, кистей, промежности", kk: "Ауқымды күйік немесе бет, қол, шат күйігі", en: "Large burn or burn of face, hands, perineum" },
  airway_burn_signs: { ru: "Признаки ожога дыхательных путей", kk: "Тыныс жолдары күйігінің белгілері", en: "Signs of airway burn" },
  possible_open_fracture: { ru: "Возможный открытый перелом", kk: "Ашық сынық болуы мүмкін", en: "Possible open fracture" },
  facial_droop: { ru: "Асимметрия лица", kk: "Бет асимметриясы", en: "Facial droop" },
  arm_leg_weakness_one_side: { ru: "Слабость руки/ноги с одной стороны", kk: "Бір жақтағы қол/аяқ әлсіздігі", en: "One-sided arm/leg weakness" },
  speech_disturbance: { ru: "Нарушение речи", kk: "Сөйлеудің бұзылуы", en: "Speech disturbance" },
  sudden_vision_loss: { ru: "Внезапная потеря зрения", kk: "Кенеттен көру қабілетінің жоғалуы", en: "Sudden vision loss" },
  sudden_balance_loss: { ru: "Внезапное нарушение равновесия", kk: "Кенеттен тепе-теңдіктің бұзылуы", en: "Sudden loss of balance" },
  thunderclap_headache: { ru: "Внезапная сильнейшая головная боль", kk: "Кенеттен болған қатты бас ауруы", en: "Sudden worst-ever headache" },
  syncope_with_exertion_or_chest_pain: { ru: "Обморок при нагрузке или с болью в груди", kk: "Жүктеме кезінде немесе кеуде ауыруымен талу", en: "Syncope on exertion or with chest pain" },
  suspected_poisoning: { ru: "Подозрение на отравление", kk: "Улану күдігі", en: "Suspected poisoning" },
  head_injury_on_anticoagulant: { ru: "Травма головы на антикоагулянтах", kk: "Антикоагулянт қабылдап жүргенде бас жарақаты", en: "Head injury on anticoagulants" },
};

// Vital-sign alert codes from the rule file.
export const VITAL_ALERT_LABELS: Record<string, L3> = {
  rr_very_low: { ru: "ЧДД ≤ 8", kk: "ТАЖ ≤ 8", en: "RR ≤ 8" },
  rr_high: { ru: "ЧДД ≥ 25", kk: "ТАЖ ≥ 25", en: "RR ≥ 25" },
  spo2_low: { ru: "SpO₂ ≤ 91%", kk: "SpO₂ ≤ 91%", en: "SpO₂ ≤ 91%" },
  sbp_low: { ru: "САД ≤ 90", kk: "Систолалық ҚҚ ≤ 90", en: "SBP ≤ 90" },
  sbp_very_high: { ru: "САД ≥ 220", kk: "Систолалық ҚҚ ≥ 220", en: "SBP ≥ 220" },
  hr_very_low: { ru: "ЧСС ≤ 40", kk: "ЖСЖ ≤ 40", en: "HR ≤ 40" },
  hr_very_high: { ru: "ЧСС ≥ 131", kk: "ЖСЖ ≥ 131", en: "HR ≥ 131" },
  temp_low: { ru: "Температура ≤ 35 °C", kk: "Температура ≤ 35 °C", en: "Temperature ≤ 35 °C" },
  gcs_very_low: { ru: "ШКГ ≤ 8", kk: "ГКШ ≤ 8", en: "GCS ≤ 8" },
  glucose_low: { ru: "Глюкоза < 4,0 ммоль/л", kk: "Глюкоза < 4,0 ммоль/л", en: "Glucose < 4.0 mmol/L" },
  consciousness_reduced: { ru: "Нарушение сознания (C/V/P/U)", kk: "Сананың бұзылуы (C/V/P/U)", en: "Reduced consciousness (C/V/P/U)" },
};

export const GENERAL_FLAGS = ["unresponsive", "not_breathing_normally", "airway_obstruction",
  "severe_breathing_difficulty", "collapse", "uncontrolled_bleeding"];
