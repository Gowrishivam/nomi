import type { AIResponse } from '../types'
const delay = (ms = 650) => new Promise(resolve => setTimeout(resolve, ms))
export const aiService = {
  async ask(question: string): Promise<AIResponse> {
    await delay()
    const text = question.toLowerCase()
    const answer = /last tuesday|working on|project/.test(text)
      ? 'You seemed most focused on the hackathon project between September 27 and September 30. You were working through the onboarding flow with Arun, then narrowed the scope after the list of ideas started to feel overwhelming. By the end of the month, the project felt more possible.'
      : /frustrat|why/.test(text)
        ? 'You mentioned feeling frustrated when the project started to hold too many ideas at once. The shift came when you chose one small flow to make real, and talked it through with Arun.'
        : 'Across the moments you have saved, a few threads stand out: the hackathon project, time with friends, and finding room to slow down. The clearest recent shift was turning a long list into one next step.'
    return { answer, sources: [{ kind: 'Voice recording', date: 'Sep 27', id: 'r4' }, { kind: 'Diary entry', date: 'Sep 28', id: 'd2' }, { kind: 'Memory', date: 'Sep 30', id: 'm2' }] }
  },
}
