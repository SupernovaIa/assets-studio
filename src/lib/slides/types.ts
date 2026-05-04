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

export interface ContentSlideOutline {
  type: 'content';
  id: string;
  moduleLabel?: string;
  title: string;
  layout: string;
  items: number;
  hasCode?: boolean;
  brief: string;
  sourceLines?: string;
}

export interface ContentSlide extends ContentSlideOutline {
  html: string;
  css: string;
}

export interface ThanksSlide {
  type: 'thanks';
  text: string;
  tagline?: string;
}

export type Slide = CoverSlide | SectionSlide | ContentSlide | ThanksSlide;
export type OutlineSlide = CoverSlide | SectionSlide | ContentSlideOutline | ThanksSlide;
