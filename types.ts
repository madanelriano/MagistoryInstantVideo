export type TransitionEffect = 'fade' | 'slide' | 'zoom';

export interface Segment {
  id: string;
  narration_text: string;
  search_keywords_for_media: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  audioUrl?: string;
  transition?: TransitionEffect;
}

export interface VideoScript {
  title: string;
  segments: Segment[];
}