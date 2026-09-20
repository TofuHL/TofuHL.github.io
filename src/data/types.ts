// Shared shapes for JSON data files that ship empty (`[]` / `null`) as
// placeholders. TypeScript can't infer element types from an empty array
// literal, so these explicit types let the JSON imports be cast rather than
// inferred as `never[]`.

export interface TimelineItem {
  year: string;
  titleKey: string;
  descKey: string;
}

export interface BoardMember {
  name: string;
  roleKey: string;
}

export interface StatSource {
  id: string;
  figureKey: string;
  textKey: string;
  source: string;
  url: string;
  date: string;
}

export interface Report {
  title: string;
  file: string;
  date: string;
  kind: string;
}

export interface OblastLocation {
  id: string;
  nameKey: string;
  x: number;
  y: number;
  programmes: string[];
}

export interface FundsMonth {
  month: string;
  cumulative: number;
}

export interface CampaignEntry {
  id: string;
  nameKey: string;
  raised: number;
  goal: number;
}

export interface ChildrenReachedYear {
  year: number;
  values: {
    education: number;
    shelter: number;
    psychosocial: number;
    nutrition: number;
  };
}
