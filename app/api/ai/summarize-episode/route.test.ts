import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import request from 'supertest';
jest.mock('@/lib/gemini', () => ({
  geminiModel: {
    generateContent: async () => ({
      response: { text: async () => 'A hero faces a new challenge.' }
    })
  }
}));
import { createServer } from 'http';
import handler from './route';

describe('POST /api/ai/summarize-episode', () => {
  it('should return a summary for a valid episode', async () => {
    const reqBody = {
      title: 'The Hero Returns',
      paragraphs: [
        { content: 'The hero wakes up in a strange land.' },
        { content: 'He meets a mysterious guide.' }
      ]
    };

    const server = createServer((req, res) => handler(req, res));
    const response = await request(server)
      .post('/api/ai/summarize-episode')
      .send(reqBody)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.summary).toBe('A hero faces a new challenge.');
  });
});
