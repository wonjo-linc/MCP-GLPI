export interface GlpiSession {
  session_token: string;
}

export interface GlpiTicket {
  id: number;
  name: string;
  content: string;
  status: number;
  urgency: number;
  priority: number;
  date: string;
  date_mod: string;
  entities_id: number;
  users_id_recipient: number;
  type: number;
}

export interface GlpiComputer {
  id: number;
  name: string;
  serial: string;
  otherserial: string;
  states_id: number;
  locations_id: number;
  manufacturers_id: number;
  computermodels_id: number;
}

export interface GlpiUser {
  id: number;
  name: string;
  realname: string;
  firstname: string;
  is_active: number;
}

export type GlpiItemType =
  | 'Ticket'
  | 'Computer'
  | 'Monitor'
  | 'NetworkEquipment'
  | 'Peripheral'
  | 'Phone'
  | 'Printer'
  | 'Software'
  | 'User';

export interface GlpiSearchOptions {
  range?: string;
  sort?: number;
  order?: 'ASC' | 'DESC';
  expand_dropdowns?: boolean;
}
