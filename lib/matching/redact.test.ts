import { describe, expect, it } from 'vitest';
import { redact } from './redact';

describe('redact', () => {
  it('removes contact details and the name', () => {
    const out = redact('Ayesha Khan, ayesha@mail.com, +92 300 1234567, 0300-1234567, linkedin.com/in/ayesha', 'Ayesha Khan');
    expect(out).not.toMatch(/ayesha|@|1234567|linkedin/i);
  });

  it('removes protected personal lines', () => {
    const out = redact('Gender: Female\nMarital Status: Single\nDate of Birth: 1 Jan 2000\nReligion: X\nCNIC: 123\nPython developer', null);
    expect(out.trim()).toBe('Python developer');
  });

  it.each([
    'Name: Ayesha Khan', 'Full Name - Ayesha Khan', 'Race: Asian', 'Ethnicity: Punjabi',
    'Disability: None', 'Sect: Sunni', 'Citizenship: Pakistani', 'Passport No: AB123',
    'Address: House 4, Lahore', 'Photo: attached',
  ])('removes the labelled line "%s"', (line) => {
    expect(redact(`${line}\nBuilt APIs`, null).trim()).toBe('Built APIs');
  });

  it('removes titles but keeps ordinary words', () => {
    expect(redact('Ms. Khan led the migration', 'Khan')).toBe('[name] led the migration');
    expect(redact('Never miss deadlines', null)).toBe('Never miss deadlines');
  });

  it('keeps job text that starts with a similar word', () => {
    const text = 'Address customer tickets daily\nNamed top performer';
    expect(redact(text, null)).toBe(text);
  });

  it('gives identical text when only labelled details differ', () => {
    const a = redact('Name: Ali Raza\nAli Raza\nGender: Male\nAge: 34\nBuilt APIs', 'Ali Raza');
    const b = redact('Name: Maria Fernandes\nMaria Fernandes\nGender: Female\nAge: 58\nBuilt APIs', 'Maria Fernandes');
    expect(a).toBe(b);
  });

  it('keeps date ranges, which are real experience evidence', () => {
    expect(redact('Backend Engineer 2019 - 2023', null)).toBe('Backend Engineer 2019 - 2023');
  });
});
