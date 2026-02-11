
export interface Patient {
  name: string;
  phone: string;
  dob: string;
  age: string;
  ta_sis: string;
  ta_dia: string;
  fc: string;
  temp: string;
  glucose: string;
  weight: string;
  height: string;
  imc: string;
  imc_class: string;
}

export interface Medication {
  name: string;
  trade?: string;
  commercial?: string;
  quantity: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Consultation {
  folio: string;
  date: string;
  date_iso: string;
  patient: Patient;
  subjetivo: string;
  diagnoses: string;
  meds: Medication[];
  exams: string;
  last_date?: string;
}

export interface Catalogs {
  meds: Medication[];
  indicaciones: string[];
  cie10: string[];
}

export interface Appointment {
  phone: string;
  name: string;
  date: string;
  time: string;
  notes: string;
}
