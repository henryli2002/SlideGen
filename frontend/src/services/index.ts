import axios from './axios'
import fetchRequest from './fetch'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8004'

interface ImageSearchPayload {
  query: string
  orientation?: 'landscape' | 'portrait' | 'square' | 'all'
  page?: number
  per_page?: number
}

interface AIPPTOutlinePayload {
  content: string
  language: string
  enableSearch?: boolean
}

interface AIPPTPayload {
  content: string
  language: string
  style: string
  numSlides?: number
  outline?: string
  enableImage?: boolean
  enableSearch?: boolean
}

interface AIWritingPayload {
  content: string
  command: string
}

export default {
  getMockData(filename: string): Promise<any> {
    return axios.get(`./mocks/${filename}.json`)
  },

  searchImage(body: ImageSearchPayload): Promise<any> {
    return axios.get(`${API_BASE}/api/search_images`, {
      params: {
        query: body.query,
        per_page: body.per_page ?? 20,
        page: body.page ?? 1,
        orientation: body.orientation ?? 'all',
      },
    })
  },

  AIPPT_Outline({ content, language, enableSearch = false }: AIPPTOutlinePayload): Promise<any> {
    return axios.post(`${API_BASE}/api/generate_outline`, {
      topic: content,
      language,
      enable_search: enableSearch,
    })
  },

  AIPPT({ content, numSlides = 12, outline = '', enableImage = false, enableSearch = false }: AIPPTPayload): Promise<any> {
    const params = new URLSearchParams({
      topic: content,
      num_slides: String(numSlides),
      enable_image: String(enableImage),
      enable_search: String(enableSearch),
      ...(outline ? { outline } : {}),
    })
    return fetchRequest(`${API_BASE}/api/generate_stream?${params}`, {
      method: 'GET',
    })
  },

  generateImage(keyword: string): Promise<any> {
    return axios.get(`${API_BASE}/api/generate_image`, { params: { keyword } })
  },

  generateSlideImage(body: { prompt: string; width: number; height: number }): Promise<any> {
    return axios.post(`${API_BASE}/api/generate_slide_image`, body)
  },

  AI_Writing({ content, command }: AIWritingPayload): Promise<any> {
    return fetchRequest(`${API_BASE}/api/ai_writing`, {
      method: 'POST',
      body: JSON.stringify({ content, command }),
    })
  },
}
