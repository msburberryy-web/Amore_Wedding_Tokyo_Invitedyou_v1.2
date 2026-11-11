import type { WeddingData } from '../../types';

export type Field = {
  key: string;
  label: string;
  kind: string;
  required?: boolean;
  max?: number;
  options?: string[];
  fields?: Field[];
  item?: Field;
};
export type EditableValue = string | boolean | EditableValue[] | Draft;
export type Draft = { [key: string]: EditableValue };
export const templateIds: readonly string[];
export const sections: { title: string; fields: Field[] }[];
export function initialValue(field: Field, seed?: unknown): EditableValue;
export function createDraft(seed: WeddingData): Draft;
export function validateSubmission(input: unknown): {
  errors: string[];
  value: { templateId: string; slug: string; customization: Draft } | null;
};
export function buildInvitation(seed: WeddingData, customization: Draft): WeddingData;
