export type SearchRecord = {
  title: string;
  route: string;
  summary: string;
  text: string;
};

export type SearchIndex = {records: SearchRecord[]};
