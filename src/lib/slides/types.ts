export interface CoverSlide {
  type: 'cover';
  module?: string;
  title: string;
  subtitle?: string;
}

export interface SectionSlide {
  type: 'section';
  number: number;
  label?: string;
  title: string;
}

export interface ContentSlide {
  type: 'content';
  id: string;
  moduleLabel?: string;
  title: string;
  layout: string;
  items: number;
  html: string;
  css: string;
}

export interface ThanksSlide {
  type: 'thanks';
  text: string;
  tagline?: string;
}

export type Slide = CoverSlide | SectionSlide | ContentSlide | ThanksSlide;
