import type {
  AppointmentRecord,
  AvailabilityResult,
  CounsellorInfo,
  DoctorInfo,
  DoctorStatus,
  SpecialistRosterEntry,
} from '../types/wellness';

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const WELLNESS_CONTACTS = {
  ambulance: '8971523447',
  wellness: '8147403386',
  landline: '0836 2309644',
  email: 'wellness.hospital@iitdh.ac.in',
  intercom: {
    Nurse: '6111',
    Security: '6112',
    Doctor: '6113',
  },
  tele_manas: '14416',
};

export const WELLNESS_LINKS: Record<string, string> = {
  map: '',
  bookPsychiatrist: '',
  bookSavita: '',
  bookDarshana: '',
  bookNavyashree: '',
  feedbackWellness: '',
  feedbackCounselSavita: '',
  feedbackCounselDarshana: '',
  feedbackCounselNavyashree: '',
  talkToAngel: '',
  talkToAngelManual: '',
  teleManas: '',
  insurancePolicy: '',
  insurancePpt: '',
  claimProcess: '',
  claimForm: '',
};

export const DOCTORS: DoctorInfo[] = [
  {
    id: 'achyutha',
    name: 'Dr. K V Achyutha',
    qual: 'MBBS, MD, DCH (Bombay), CCEBDM',
    spec: 'Paediatrician',
    when: 'Tue 1:30 PM – 3:00 PM',
    slots: [{ days: [2], start: '13:30', end: '15:00' }],
  },
  {
    id: 'aditya',
    name: 'Dr. Aditya Pandurangi',
    qual: 'MBBS, MD',
    spec: 'Consultant Psychiatrist',
    when: 'Sun 3:30 PM – 5:00 PM',
    slots: [{ days: [0], start: '15:30', end: '17:00' }],
    bookKey: 'bookPsychiatrist',
  },
  {
    id: 'anuradha',
    name: 'Dr. Anuradha Biserotti',
    qual: 'BAMS, MD (Ayu)',
    spec: 'Ayurveda',
    when: 'Mon, Tue, Wed 10 AM – 4 PM',
    slots: [{ days: [1, 2, 3], start: '10:00', end: '16:00' }],
  },
  {
    id: 'aravind',
    name: 'Dr. Aravind Shetty',
    qual: 'MBBS',
    spec: 'General Physician',
    when: 'Mon–Sat 9 AM – 5 PM',
    slots: [{ days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '17:00' }],
  },
  {
    id: 'bhavna',
    name: 'Dr. Bhavna Narang',
    qual: 'MBBS, DLO (AFMC Pune), DNB ENT',
    spec: 'ENT Specialist',
    when: 'Tue 2:30 PM – 4:00 PM',
    slots: [{ days: [2], start: '14:30', end: '16:00' }],
  },
  {
    id: 'geeta',
    name: 'Dr. Geeta Bagewadi',
    qual: 'BHMS, MD',
    spec: 'Homoeopathy',
    when: 'Thu 12–6 PM · Fri 11:30 AM–5:30 PM · Sat 11 AM–5 PM',
    slots: [
      { days: [4], start: '12:00', end: '18:00' },
      { days: [5], start: '11:30', end: '17:30' },
      { days: [6], start: '11:00', end: '17:00' },
    ],
  },
  {
    id: 'harish',
    name: 'Dr. Harish Kumar',
    qual: 'MBBS',
    spec: 'General Physician',
    when: 'Mon–Sat 2 PM – 8 PM',
    slots: [{ days: [1, 2, 3, 4, 5, 6], start: '14:00', end: '20:00' }],
  },
  {
    id: 'shobha',
    name: 'Dr. Shobha Mulimani',
    qual: 'MBBS, DGO',
    spec: 'Gynecologist',
    when: 'Mon, Tue, Wed, Fri, Sat, Sun 11 AM – 5 PM',
    slots: [{ days: [0, 1, 2, 3, 5, 6], start: '11:00', end: '17:00' }],
  },
  {
    id: 'javali',
    name: 'Dr. Shrikrishna N. Javali',
    qual: 'MBBS, MD',
    spec: 'General Physician',
    when: 'Wed & Sun 6:30 PM – 8:00 PM',
    slots: [{ days: [0, 3], start: '18:30', end: '20:00' }],
  },
];

export const COUNSELLORS: CounsellorInfo[] = [
  {
    id: 'savita',
    name: 'Ms. Savita Angadi',
    qual: 'Masters in Psychology',
    spec: 'Counseling Psychologist',
    when: 'Wednesday',
    bookKey: 'bookSavita',
    feedbackKey: 'feedbackCounselSavita',
  },
  {
    id: 'darshana',
    name: 'Darshana Kishore Gandhi',
    qual: 'M.Sc., M.Phil.',
    spec: 'Clinical Psychologist (RCI-licensed)',
    when: 'See booking link',
    bookKey: 'bookDarshana',
    feedbackKey: 'feedbackCounselDarshana',
  },
  {
    id: 'navyashree',
    name: 'Mrs. Navyashree',
    qual: 'M.Sc. Clinical & Counseling Psychology',
    spec: 'Counseling Psychologist',
    when: 'See booking link',
    bookKey: 'bookNavyashree',
    feedbackKey: 'feedbackCounselNavyashree',
  },
];

export const ALL_PRACTITIONERS = [...DOCTORS, ...COUNSELLORS];

export const SPECIALIST_TIME = '3 PM – 5 PM';

export const DEFAULT_SPECIALIST_ROSTER: Record<string, string[]> = {
  '2026-10-03': [
    'Physiotherapy: Dr. Ravi Savadatti',
    'ENT: Dr. Raghunath Shanbhag',
    'ENT: Dr. Akshata Nagaral',
    'Dermatology: Dr. Pratima Tumbal',
  ],
  '2026-10-10': [
    'Physiotherapy: Dr. Ravi Savadatti',
    'ENT: Dr. Akshata Nagaral',
    'Dermatology: Dr. Pratima Tumbal',
  ],
  '2026-10-17': [
    'Physiotherapy: Dr. Ravi Savadatti',
    'ENT: Dr. Akshata Nagaral',
    'Dermatology: Dr. Pratima Tumbal',
  ],
  '2026-10-24': [
    'Physiotherapy: Dr. Ravi Savadatti',
    'ENT: Dr. Akshata Nagaral',
    'Dermatology: Dr. Pratima Tumbal',
  ],
  '2026-10-31': [
    'Physiotherapy: Dr. Ravi Savadatti',
    'ENT: Dr. Akshata Nagaral',
    'Dermatology: Dr. Pratima Tumbal',
  ],
};

export const SPECIALIST_DEFAULT = [
  'Physiotherapy: Dr. Ravi Savadatti',
  'ENT: Dr. Akshata Nagaral',
  'Dermatology: Dr. Pratima Tumbal',
];

export const EMERGENCY_PROTOCOL =
  'In a life-threatening emergency, call the ambulance and speak directly with the nurse / ambulance driver. Also inform ONE of: FIC Health, Associate Dean Wellness, or Dean Student Welfare.';

export const MOODS = [
  { emoji: '😞', score: 1, label: 'Awful' },
  { emoji: '🙁', score: 2, label: 'Low' },
  { emoji: '😐', score: 3, label: 'Okay' },
  { emoji: '🙂', score: 4, label: 'Good' },
  { emoji: '😄', score: 5, label: 'Great' },
] as const;

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function formatTime12h(t: string): string {
  const [hRaw, m] = t.split(':').map(Number);
  const ap = hRaw >= 12 ? 'PM' : 'AM';
  const h = hRaw % 12 || 12;
  return `${h}${m ? `:${m < 10 ? '0' : ''}${m}` : ''} ${ap}`;
}

export function toIsoDate(d: Date): string {
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildTelHref(num: string): string {
  return `tel:${String(num).replace(/\s+/g, '')}`;
}

export function getDoctorAvailability(
  doc: DoctorInfo,
  overrideStatus?: DoctorStatus,
  now: Date = new Date()
): AvailabilityResult {
  const override = overrideStatus?.availabilityOverride ?? 'auto';
  const customNote = overrideStatus?.customNote || undefined;

  if (override === 'available') {
    return {
      now: true,
      label: 'Available Now',
      detail: 'Marked on duty by physician',
      overrideState: override,
      customNote,
    };
  }
  if (override === 'in_consultation') {
    return {
      now: true,
      label: 'In Consultation',
      detail: 'On duty · currently with a patient',
      overrideState: override,
      customNote,
    };
  }
  if (override === 'on_leave') {
    return {
      now: false,
      label: 'On Leave',
      detail: 'Unavailable today',
      overrideState: override,
      customNote,
    };
  }

  const dayIndex = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();

  for (const s of doc.slots) {
    if (s.days.includes(dayIndex) && minutes >= toMinutes(s.start) && minutes < toMinutes(s.end)) {
      return {
        now: true,
        label: 'Available Now',
        detail: `Till ${formatTime12h(s.end)}`,
        overrideState: 'auto',
        customNote,
      };
    }
  }

  for (let offset = 0; offset < 8; offset++) {
    const checkDay = (dayIndex + offset) % 7;
    let earliest: { start: string; end: string } | null = null;
    for (const s of doc.slots) {
      if (!s.days.includes(checkDay)) continue;
      if (offset === 0 && toMinutes(s.start) <= minutes) continue;
      if (!earliest || toMinutes(s.start) < toMinutes(earliest.start)) {
        earliest = s;
      }
    }
    if (earliest) {
      const dayLabel = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : DAYS[checkDay];
      return {
        now: false,
        label: `Next: ${dayLabel} ${formatTime12h(earliest.start)}`,
        detail: `${dayLabel} at ${formatTime12h(earliest.start)}`,
        overrideState: 'auto',
        customNote,
      };
    }
  }

  return {
    now: false,
    label: 'Schedule Unlisted',
    detail: 'Check at Wellness Centre',
    overrideState: 'auto',
    customNote,
  };
}

export function getNextSaturdayRoster(
  remoteRosters: Record<string, SpecialistRosterEntry> = {},
  now: Date = new Date()
) {
  const d = new Date(now);
  const add = (6 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + add);
  const key = toIsoDate(d);
  const remote = remoteRosters[key];
  const staticKnown = DEFAULT_SPECIALIST_ROSTER[key];

  return {
    date: d,
    key,
    timeWindow: remote?.timeWindow || SPECIALIST_TIME,
    list: remote?.specialists || staticKnown || SPECIALIST_DEFAULT,
    tentative: !remote && !staticKnown,
  };
}

export function downloadAppointmentIcs(appt: AppointmentRecord): void {
  const start = `${appt.date.replace(/-/g, '')}T${appt.time.replace(':', '')}00`;
  const desc = (appt.reason || appt.doctorSpec).replace(/\n/g, ' ');
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IITDH Wellness//EN',
    'BEGIN:VEVENT',
    `UID:${appt.id}@iitdh-wellness`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    'DURATION:PT30M',
    `SUMMARY:Wellness Centre – ${appt.doctorName}`,
    `DESCRIPTION:${desc}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appointment in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
  const el = document.createElement('a');
  el.href = url;
  el.download = `wellness-${appt.date}.ics`;
  document.body.appendChild(el);
  el.click();
  el.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
