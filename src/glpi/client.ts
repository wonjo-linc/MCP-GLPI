import axios, { AxiosInstance } from 'axios';
import { GlpiItemType, GlpiSearchOptions, GlpiSession } from '../types/glpi';

export class GlpiClient {
  private api: AxiosInstance;
  private sessionToken: string | null = null;

  constructor(
    private baseUrl: string,
    private appToken: string,
    private userToken: string,
  ) {
    this.api = axios.create({
      baseURL: `${this.baseUrl}/apirest.php`,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'App-Token': this.appToken,
      },
      responseType: 'json',
      responseEncoding: 'utf8',
    });
  }

  async initSession(): Promise<string> {
    const response = await this.api.get<GlpiSession>('/initSession', {
      headers: {
        Authorization: `user_token ${this.userToken}`,
      },
    });
    this.sessionToken = response.data.session_token;
    return this.sessionToken;
  }

  async killSession(): Promise<void> {
    if (!this.sessionToken) return;
    await this.api.get('/killSession', {
      headers: { 'Session-Token': this.sessionToken },
    });
    this.sessionToken = null;
  }

  private getAuthHeaders() {
    if (!this.sessionToken) {
      throw new Error('No active session. Call initSession() first.');
    }
    return { 'Session-Token': this.sessionToken };
  }

  async getItem(itemType: GlpiItemType, id: number): Promise<Record<string, unknown>> {
    const response = await this.api.get(`/${itemType}/${id}`, {
      headers: this.getAuthHeaders(),
      params: { expand_dropdowns: true },
    });
    return response.data;
  }

  async getItems(
    itemType: GlpiItemType,
    options: GlpiSearchOptions = {},
  ): Promise<Record<string, unknown>[]> {
    const response = await this.api.get(`/${itemType}`, {
      headers: this.getAuthHeaders(),
      params: {
        range: options.range || '0-49',
        sort: options.sort,
        order: options.order || 'DESC',
        expand_dropdowns: options.expand_dropdowns ?? true,
      },
    });
    return response.data;
  }

  async createItem(
    itemType: GlpiItemType,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await this.api.post(
      `/${itemType}`,
      { input: data },
      { headers: this.getAuthHeaders() },
    );
    return response.data;
  }

  async updateItem(
    itemType: GlpiItemType,
    id: number,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await this.api.put(
      `/${itemType}/${id}`,
      { input: data },
      { headers: this.getAuthHeaders() },
    );
    return response.data;
  }

  async deleteItem(itemType: GlpiItemType, id: number): Promise<Record<string, unknown>> {
    const response = await this.api.delete(`/${itemType}/${id}`, {
      headers: this.getAuthHeaders(),
      params: { force_purge: true },
    });
    return response.data;
  }

  async searchItems(
    itemType: GlpiItemType,
    criteria: Record<string, unknown>[],
  ): Promise<Record<string, unknown>> {
    const params: Record<string, unknown> = {};
    criteria.forEach((c, i) => {
      Object.entries(c).forEach(([key, value]) => {
        params[`criteria[${i}][${key}]`] = value;
      });
    });

    const response = await this.api.get(`/search/${itemType}`, {
      headers: this.getAuthHeaders(),
      params,
    });
    return response.data;
  }
}
