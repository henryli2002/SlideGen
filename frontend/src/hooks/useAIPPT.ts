import { ref } from 'vue'
import { nanoid } from 'nanoid'
import type { ImageClipDataRange, PPTElement, PPTImageElement, PPTShapeElement, PPTTableElement, PPTTextElement, Slide, TableCell, TextType } from '@/types/slides'
import type { AIPPTSlide } from '@/types/AIPPT'
import { useSlidesStore } from '@/store'
import useAddSlidesOrElements from './useAddSlidesOrElements'
import useSlideHandler from './useSlideHandler'
import api from '@/services'
import { getImageSize } from '@/utils/image'

interface ImgPoolItem {
  id: string
  src: string
  width: number
  height: number
}

export default () => {
  const slidesStore = useSlidesStore()
  const { addSlidesFromData } = useAddSlidesOrElements()
  const { isEmptySlide } = useSlideHandler()

  const imgPool = ref<ImgPoolItem[]>([])
  const transitionIndex = ref(0)
  const transitionTemplate = ref<Slide | null>(null)

  const checkTextType = (el: PPTElement, type: TextType) => {
    return (el.type === 'text' && el.textType === type) || (el.type === 'shape' && el.text && el.text.type === type)
  }
  
  const getUseableTemplates = (templates: Slide[], n: number, type: TextType) => {
    if (n === 1) {
      const list = templates.filter(slide => {
        const items = slide.elements.filter(el => checkTextType(el, type))
        const titles = slide.elements.filter(el => checkTextType(el, 'title'))
        const texts = slide.elements.filter(el => checkTextType(el, 'content'))
  
        return !items.length && titles.length === 1 && texts.length === 1
      })
  
      if (list.length) return list
    }
  
    let target: Slide | null = null
  
    const list = templates.filter(slide => {
      const len = slide.elements.filter(el => checkTextType(el, type)).length
      return len >= n
    })
    if (list.length === 0) {
      const sorted = templates.sort((a, b) => {
        const aLen = a.elements.filter(el => checkTextType(el, type)).length
        const bLen = b.elements.filter(el => checkTextType(el, type)).length
        return aLen - bLen
      })
      target = sorted[sorted.length - 1]
    }
    else {
      target = list.reduce((closest, current) => {
        const currentLen = current.elements.filter(el => checkTextType(el, type)).length
        const closestLen = closest.elements.filter(el => checkTextType(el, type)).length
        return (currentLen - n) <= (closestLen - n) ? current : closest
      })
    }
  
    return templates.filter(slide => {
      const len = slide.elements.filter(el => checkTextType(el, type)).length
      const targetLen = target!.elements.filter(el => checkTextType(el, type)).length
      return len === targetLen
    })
  }
  
  const getAdaptedFontsize = ({
    text,
    fontSize,
    fontFamily,
    width,
    height,
    lineHeight,
    maxLine,
  }: {
    text: string
    fontSize: number
    fontFamily: string
    width: number
    height: number
    lineHeight: number
    maxLine: number
  }) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
  
    let newFontSize = fontSize
    const minFontSize = 10
  
    while (newFontSize >= minFontSize) {
      context.font = `${newFontSize}px ${fontFamily}`
      const textWidth = context.measureText(text).width
      const line = Math.ceil(textWidth / width)

      if (maxLine > 1 && height) {
        const heightOfLine = Math.max(newFontSize, 16) * (newFontSize < 15 ? 1.2 : lineHeight) * 1.2
        const totalHeight = line * heightOfLine
        if (totalHeight <= height) return newFontSize
      }
      if (line <= maxLine) return newFontSize

      const step = newFontSize <= 22 ? 1 : 2
      newFontSize = newFontSize - step
    }
  
    return minFontSize
  }
  
  const getFontInfo = (htmlString: string) => {
    const fontSizeRegex = /font-size:\s*(\d+(?:\.\d+)?)\s*px/i
    const fontFamilyRegex = /font-family:\s*['"]?([^'";]+)['"]?\s*(?=;|>|$)/i
  
    const defaultInfo = {
      fontSize: 16,
      fontFamily: 'Microsoft Yahei',
    }
  
    const fontSizeMatch = htmlString.match(fontSizeRegex)
    const fontFamilyMatch = htmlString.match(fontFamilyRegex)
  
    return {
      fontSize: fontSizeMatch ? (+fontSizeMatch[1].trim()) : defaultInfo.fontSize,
      fontFamily: fontFamilyMatch ? fontFamilyMatch[1].trim() : defaultInfo.fontFamily,
    }
  }
  
  const getNewTextElement = ({
    el,
    text,
    maxLine,
    longestText,
    digitPadding,
  }: {
    el: PPTTextElement | PPTShapeElement
    text: string
    maxLine: number
    longestText?: string
    digitPadding?: boolean
  }): PPTTextElement | PPTShapeElement => {
    const padding = 10
    const width = el.width - padding * 2 - 2
    const height = el.height - padding * 2 - 2
    const lineHeight = el.type === 'text' ? (el.lineHeight || 1.5) : 1.2
    let content = el.type === 'text' ? el.content : el.text!.content
  
    const fontInfo = getFontInfo(content)
    const size = getAdaptedFontsize({
      text: longestText || text,
      fontSize: fontInfo.fontSize,
      fontFamily: fontInfo.fontFamily,
      width,
      height,
      lineHeight,
      maxLine,
    })
  
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
  
    const treeWalker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  
    const firstTextNode = treeWalker.nextNode()
    if (firstTextNode) {
      if (digitPadding && firstTextNode.textContent && firstTextNode.textContent.length === 2 && text.length === 1) {
        firstTextNode.textContent = '0' + text
      }
      else firstTextNode.textContent = text

      let node
      while ((node = treeWalker.nextNode())) {
        node.parentNode?.removeChild(node)
      }
    }
  
    if (doc.body.innerHTML.indexOf('font-size') === -1) {
      const p = doc.querySelector('p')
      if (p) p.style.fontSize = '16px'
    }
  
    content = doc.body.innerHTML.replace(/font-size:(.+?)px/g, `font-size: ${size}px`)
  
    return el.type === 'text' ? { ...el, content, lineHeight: size < 15 ? 1.2 : el.lineHeight } : { ...el, text: { ...el.text!, content } }
  }

  const getUseableImage = (el: PPTImageElement): ImgPoolItem | null => {
    let img: ImgPoolItem | null = null
  
    let imgs = []
  
    if (el.width === el.height) imgs = imgPool.value.filter(img => img.width === img.height)
    else if (el.width > el.height) imgs = imgPool.value.filter(img => img.width > img.height)
    else imgs = imgPool.value.filter(img => img.width <= img.height)
    if (!imgs.length) imgs = imgPool.value
  
    img = imgs[Math.floor(Math.random() * imgs.length)]
    imgPool.value = imgPool.value.filter(item => item.id !== img!.id)
  
    return img
  }
  
  const getNewImgElement = (el: PPTImageElement): PPTImageElement => {
    const img = getUseableImage(el)
    if (!img) return el
  
    let scale = 1
    let w = el.width
    let h = el.height
    let range: ImageClipDataRange = [[0, 0], [0, 0]]
    const radio = el.width / el.height
    if (img.width / img.height >= radio) {
      scale = img.height / el.height
      w = img.width / scale
      const diff = (w - el.width) / 2 / w * 100
      range = [[diff, 0], [100 - diff, 100]]
    }
    else {
      scale = img.width / el.width
      h = img.height / scale
      const diff = (h - el.height) / 2 / h * 100
      range = [[0, diff], [100, 100 - diff]]
    }
    const clipShape = (el.clip && el.clip.shape) ? el.clip.shape : 'rect'
    const clip = { range, shape: clipShape }
    const src = img.src
  
    return { ...el, src, clip }
  }
  
  /**
   * Center-crop an image to fill a slot exactly.
   * imgWidth/imgHeight = actual pixel dimensions of the source image.
   * The clip percentages are applied to the source image coordinate space.
   */
  const fitImageToSlot = (el: PPTImageElement, src: string, imgWidth: number, imgHeight: number): PPTImageElement => {
    const srcRatio = imgWidth / imgHeight
    const slotRatio = el.width / el.height
    let range: ImageClipDataRange = [[0, 0], [100, 100]]

    if (srcRatio > slotRatio + 0.01) {
      // Image wider than slot → fill height, crop sides
      const visibleFraction = slotRatio / srcRatio
      const offset = (1 - visibleFraction) / 2 * 100
      range = [[offset, 0], [100 - offset, 100]]
    } else if (srcRatio < slotRatio - 0.01) {
      // Image taller than slot → fill width, crop top/bottom
      const visibleFraction = srcRatio / slotRatio
      const offset = (1 - visibleFraction) / 2 * 100
      range = [[0, offset], [100, 100 - offset]]
    }

    // For rotated elements: zoom in further so the image fills the rotated frame
    // without exposing blank corners. The rotation is preserved as a design element.
    if (el.rotate) {
      const theta = Math.abs(el.rotate) * Math.PI / 180
      const cosT = Math.cos(theta)
      const sinT = Math.sin(theta)
      const W = el.width, H = el.height
      const zoom = Math.max(
        (W * cosT + H * sinT) / W,
        (W * sinT + H * cosT) / H,
      )
      const cx = (range[0][0] + range[1][0]) / 2
      const cy = (range[0][1] + range[1][1]) / 2
      const hw = (range[1][0] - range[0][0]) / 2 / zoom
      const hh = (range[1][1] - range[0][1]) / 2 / zoom
      range = [
        [Math.max(0, cx - hw), Math.max(0, cy - hh)],
        [Math.min(100, cx + hw), Math.min(100, cy + hh)],
      ]
    }

    const clipShape = el.clip?.shape || 'rect'
    return { ...el, src, clip: { shape: clipShape, range } }
  }

  /**
   * Build an English image generation prompt from slide content.
   * Used to fill image slots in a naturally-selected template.
   */
  const buildSlideImagePrompt = (title: string): string => {
    return (
      `Professional high-quality photograph for a business presentation slide about: ${title}. ` +
      `Clean composition, good lighting, ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO WATERMARKS, NO TYPOGRAPHY, blank surfaces, suitable as a slide illustration.`
    )
  }

  /**
   * After a slide is added to the store, asynchronously fill its image slots
   * with AI-generated images sized to match each slot exactly.
   * Fires and forgets — the slide renders immediately with the template placeholder,
   * then updates in-place as images resolve.
   */
  const fillImageSlotsAsync = (
    slideId: string,
    templateSlide: Slide,
    title: string,
    itemTitles: string[] = [],
  ) => {
    const allImageSlots = templateSlide.elements.filter(
      el => el.type === 'image' && el.imageType && ['pageFigure', 'background', 'itemFigure'].includes(el.imageType)
    ) as PPTImageElement[]

    const updateSlot = async (el: PPTImageElement, slotPrompt: string) => {
      const w = Math.round(el.width)
      const h = Math.round(el.height)
      try {
        const result = await api.generateSlideImage({ prompt: slotPrompt, width: w, height: h })
        if (!result?.url) return
        const { width: imgW, height: imgH } = await getImageSize(result.url)
        const updated = fitImageToSlot(el, result.url, imgW, imgH)

        const currentSlideStore = slidesStore.slides.find(s => s.id === slideId)
        if (!currentSlideStore) return
        const currentEl = currentSlideStore.elements.find(e => e.id === el.id)
        if (!currentEl) return

        slidesStore.updateElement({
          id: el.id,
          props: {
            src: updated.src,
            clip: updated.clip,
            lock: false,
          } as Partial<PPTElement>,
          slideId,
        })
      } catch {
        // Silently fail — template placeholder remains
      }
    }

    // Each slot gets its own independent API call with a unique prompt
    let itemFigureIndex = 0
    for (const slot of allImageSlots) {
      let slotTitle = title
      if (slot.imageType === 'itemFigure' && itemTitles.length > 0) {
        slotTitle = itemTitles[itemFigureIndex % itemTitles.length] || title
        itemFigureIndex++
      }
      updateSlot(slot, buildSlideImagePrompt(slotTitle))
    }
  }

  const getMdContent = (content: string) => {
    const regex = /```markdown([^```]*)```/
    const match = content.match(regex)
    if (match) return match[1].trim()
    return content.replace('```markdown', '').replace('```', '')
  }

  const presetImgPool = (imgs: ImgPoolItem[]) => {
    imgPool.value = imgs
  }

  const createTableSlide = (
    baseTemplate: Slide,
    title: string,
    headers: string[],
    rows: string[][],
    themeColor: string,
  ): Slide => {
    const itemEls = baseTemplate.elements.filter(el =>
      checkTextType(el, 'item') || checkTextType(el, 'itemTitle') ||
      checkTextType(el, 'itemNumber') || checkTextType(el, 'content')
    )

    let tableLeft = 50
    let tableTop = 120
    let tableWidth = 900
    let tableHeight = 380

    if (itemEls.length > 0) {
      tableLeft = Math.min(...itemEls.map(el => el.left))
      tableTop = Math.min(...itemEls.map(el => el.top))
      const tableRight = Math.max(...itemEls.map(el => {
        if (el.type === 'line') return el.left + Math.max(el.start[0], el.end[0])
        return el.left + el.width
      }))
      const tableBottom = Math.max(...itemEls.map(el => {
        if (el.type === 'line') return el.top + Math.max(el.start[1], el.end[1])
        return el.top + el.height
      }))
      tableWidth = tableRight - tableLeft
      tableHeight = tableBottom - tableTop
    }

    const totalRows = rows.length + 1
    const cellMinHeight = Math.max(36, Math.floor(tableHeight / totalRows))

    const headerRow: TableCell[] = headers.map(h => ({
      id: nanoid(10),
      colspan: 1,
      rowspan: 1,
      text: h,
      style: { bold: true, color: '#ffffff', backcolor: themeColor },
    }))

    const dataRows: TableCell[][] = rows.map(row =>
      row.map(cell => ({
        id: nanoid(10),
        colspan: 1,
        rowspan: 1,
        text: cell,
      }))
    )

    const colWidth = 1 / headers.length
    const tableElement: PPTTableElement = {
      type: 'table',
      id: nanoid(10),
      left: tableLeft,
      top: tableTop,
      width: tableWidth,
      height: tableHeight,
      rotate: 0,
      colWidths: headers.map(() => colWidth),
      cellMinHeight,
      outline: { width: 1, color: '#dddddd', style: 'solid' },
      theme: {
        color: themeColor,
        rowHeader: true,
        rowFooter: false,
        colHeader: false,
        colFooter: false,
      },
      data: [headerRow, ...dataRows],
    }

    const keepElements = baseTemplate.elements
      .filter(el =>
        !checkTextType(el, 'item') && !checkTextType(el, 'itemTitle') &&
        !checkTextType(el, 'itemNumber') && !checkTextType(el, 'content')
      )
      .map(el => {
        if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el)
        if (el.type !== 'text' && el.type !== 'shape') return el
        if (checkTextType(el, 'title') && title) {
          return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: title, maxLine: 1 })
        }
        return el
      })

    return {
      ...baseTemplate,
      id: nanoid(10),
      elements: [...keepElements, tableElement],
    }
  }

  const AIPPT = (templateSlides: Slide[], _AISlides: AIPPTSlide[], imgs?: ImgPoolItem[], themeColor = '#4472C4', enableImage = false) => {
    slidesStore.updateSlideIndex(slidesStore.slides.length - 1)

    if (imgs) imgPool.value = imgs

    const AISlides: AIPPTSlide[] = []
    for (const template of _AISlides) {
      if (template.type === 'content') {
        const items = template.data.items
        if (items.length === 5 || items.length === 6) {
          const items1 = items.slice(0, 3)
          const items2 = items.slice(3)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 3 })
        }
        else if (items.length === 7 || items.length === 8) {
          const items1 = items.slice(0, 4)
          const items2 = items.slice(4)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 4 })
        }
        else if (items.length === 9 || items.length === 10) {
          const items1 = items.slice(0, 3)
          const items2 = items.slice(3, 6)
          const items3 = items.slice(6)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 3 })
          AISlides.push({ ...template, data: { ...template.data, items: items3 }, offset: 6 })
        }
        else if (items.length > 10) {
          const items1 = items.slice(0, 4)
          const items2 = items.slice(4, 8)
          const items3 = items.slice(8)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 4 })
          AISlides.push({ ...template, data: { ...template.data, items: items3 }, offset: 8 })
        }
        else {
          AISlides.push(template)
        }
      }
      else if (template.type === 'contents') {
        const items = template.data.items
        if (items.length === 11) {
          const items1 = items.slice(0, 6)
          const items2 = items.slice(6)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 6 })
        }
        else if (items.length > 11) {
          const items1 = items.slice(0, 10)
          const items2 = items.slice(10)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 10 })
        }
        else {
          AISlides.push(template)
        }
      }
      else AISlides.push(template)
    }

    const coverTemplates = templateSlides.filter(slide => slide.type === 'cover')
    const contentsTemplates = templateSlides.filter(slide => slide.type === 'contents')
    const transitionTemplates = templateSlides.filter(slide => slide.type === 'transition')
    const contentTemplates = templateSlides.filter(slide => slide.type === 'content')
    const endTemplates = templateSlides.filter(slide => slide.type === 'end')

    // table slides reuse content templates; pick the one with the most item slots as base
    const tableBaseTemplate = contentTemplates.reduce((best, curr) => {
      const currItems = curr.elements.filter(el => checkTextType(el, 'item')).length
      const bestItems = best.elements.filter(el => checkTextType(el, 'item')).length
      return currItems > bestItems ? curr : best
    }, contentTemplates[0])

    if (!transitionTemplate.value) {
      const _transitionTemplate = transitionTemplates[Math.floor(Math.random() * transitionTemplates.length)]
      transitionTemplate.value = _transitionTemplate
    }

    const slides: Slide[] = []
    const pendingImageFillInfos: Array<{
      slideIndex: number
      template: Slide
      title: string
      itemTitles: string[]
    }> = []

    for (const item of AISlides) {
      if (item.type === 'cover') {
        const coverTemplate = JSON.parse(JSON.stringify(coverTemplates[Math.floor(Math.random() * coverTemplates.length)]))
        const elements = coverTemplate.elements.map((el: PPTElement) => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el as PPTImageElement)
          if (el.type !== 'text' && el.type !== 'shape') return el
          if (checkTextType(el, 'title') && item.data.title) {
            return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: item.data.title, maxLine: 1 })
          }
          if (checkTextType(el, 'content') && item.data.text) {
            return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: item.data.text, maxLine: 3 })
          }
          return el
        })
        slides.push({
          ...coverTemplate,
          id: nanoid(10),
          elements,
        })
        if (enableImage) {
          pendingImageFillInfos.push({
            slideIndex: slides.length - 1,
            template: coverTemplate,
            title: item.data.title || 'Presentation Cover',
            itemTitles: [],
          })
        }
      }
      else if (item.type === 'contents') {
        const _contentsTemplates = getUseableTemplates(contentsTemplates, item.data.items.length, 'item')
        const contentsTemplate = JSON.parse(JSON.stringify(_contentsTemplates[Math.floor(Math.random() * _contentsTemplates.length)]))

        const sortedNumberItems = contentsTemplate.elements.filter((el: PPTElement) => checkTextType(el, 'itemNumber'))
        const sortedNumberItemIds = sortedNumberItems.sort((a: PPTElement, b: PPTElement) => {
          if (sortedNumberItems.length > 6) {
            let aContent = ''
            let bContent = ''
            if (a.type === 'text') aContent = (a as PPTTextElement).content
            if (a.type === 'shape') aContent = (a as PPTShapeElement).text!.content
            if (b.type === 'text') bContent = (b as PPTTextElement).content
            if (b.type === 'shape') bContent = (b as PPTShapeElement).text!.content

            if (aContent && bContent) {
              const aIndex = parseInt(aContent)
              const bIndex = parseInt(bContent)

              return aIndex - bIndex
            }
          }
          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map((el: PPTElement) => el.id)

        const sortedItems = contentsTemplate.elements.filter((el: PPTElement) => checkTextType(el, 'item'))
        const sortedItemIds = sortedItems.sort((a: PPTElement, b: PPTElement) => {
          if (sortedItems.length > 6) {
            const aItemNumber = sortedNumberItems.find((item: PPTElement) => item.groupId === a.groupId)
            const bItemNumber = sortedNumberItems.find((item: PPTElement) => item.groupId === b.groupId)

            if (aItemNumber && bItemNumber) {
              let aContent = ''
              let bContent = ''
              if (aItemNumber.type === 'text') aContent = (aItemNumber as PPTTextElement).content
              if (aItemNumber.type === 'shape') aContent = (aItemNumber as PPTShapeElement).text!.content
              if (bItemNumber.type === 'text') bContent = (bItemNumber as PPTTextElement).content
              if (bItemNumber.type === 'shape') bContent = (bItemNumber as PPTShapeElement).text!.content
  
              if (aContent && bContent) {
                const aIndex = parseInt(aContent)
                const bIndex = parseInt(bContent)
  
                return aIndex - bIndex
              }
            }
          }

          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map((el: PPTElement) => el.id)

        const longestText = item.data.items.reduce((longest: string, current: string) => current.length > longest.length ? current : longest, '')

        const unusedElIds: string[] = []
        const unusedGroupIds: string[] = []
        const elements = contentsTemplate.elements.map((el: PPTElement) => {
          if (el.type === 'image' && el.imageType) {
            if (imgPool.value.length && el.imageType !== 'itemFigure') return getNewImgElement(el as PPTImageElement)
            return el
          }
          if (el.type !== 'text' && el.type !== 'shape') return el
          if (checkTextType(el, 'item')) {
            const index = sortedItemIds.findIndex((id: string) => id === el.id)
            const itemTitle = item.data.items[index]
            if (itemTitle) return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: itemTitle, maxLine: 1, longestText })

            unusedElIds.push(el.id)
            if (el.groupId) unusedGroupIds.push(el.groupId)
          }
          if (checkTextType(el, 'itemNumber')) {
            const index = sortedNumberItemIds.findIndex((id: string) => id === el.id)
            const offset = item.offset || 0
            return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: index + offset + 1 + '', maxLine: 1, digitPadding: true })
          }
          return el
        }).filter((el: PPTElement) => !unusedElIds.includes(el.id) && !(el.groupId && unusedGroupIds.includes(el.groupId)))
        
        slides.push({
          ...contentsTemplate,
          id: nanoid(10),
          elements,
        })
        if (enableImage) {
          pendingImageFillInfos.push({
            slideIndex: slides.length - 1,
            template: contentsTemplate,
            title: 'Table of Contents',
            itemTitles: item.data.items,
          })
        }
      }
      else if (item.type === 'transition') {
        transitionIndex.value = transitionIndex.value + 1
        const _transitionTemplate = JSON.parse(JSON.stringify(transitionTemplate.value!))
        const elements = _transitionTemplate.elements.map((el: PPTElement) => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el as PPTImageElement)
          if (el.type !== 'text' && el.type !== 'shape') return el
          if (checkTextType(el, 'title') && item.data.title) {
            return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: item.data.title, maxLine: 1 })
          }
          if (checkTextType(el, 'content') && item.data.text) {
            return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: item.data.text, maxLine: 3 })
          }
          if (checkTextType(el, 'partNumber')) {
            return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: transitionIndex.value + '', maxLine: 1, digitPadding: true })
          }
          return el
        })
        slides.push({
          ..._transitionTemplate,
          id: nanoid(10),
          elements,
        })
        if (enableImage) {
          pendingImageFillInfos.push({
            slideIndex: slides.length - 1,
            template: _transitionTemplate,
            title: item.data.title || 'Section Transition',
            itemTitles: [],
          })
        }
      }
      else if (item.type === 'content') {
        const hasLargeImageSlot = (slide: Slide) => slide.elements.some((el: PPTElement) => el.type === 'image' && (el.imageType === 'pageFigure' || el.imageType === 'background'))
        const imgContentTemplates = contentTemplates.filter(hasLargeImageSlot)
        const plainContentTemplates = contentTemplates.filter(slide => !hasLargeImageSlot(slide))
        const poolForItem = plainContentTemplates.length ? plainContentTemplates : contentTemplates
        const _contentTemplates = getUseableTemplates(poolForItem, item.data.items.length, 'item')
        const contentTemplate = JSON.parse(JSON.stringify(_contentTemplates[Math.floor(Math.random() * _contentTemplates.length)]))

        const sortedTitleItemIds = contentTemplate.elements.filter((el: PPTElement) => checkTextType(el, 'itemTitle')).sort((a: PPTElement, b: PPTElement) => {
          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map((el: PPTElement) => el.id)

        const sortedTextItemIds = contentTemplate.elements.filter((el: PPTElement) => checkTextType(el, 'item')).sort((a: PPTElement, b: PPTElement) => {
          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map((el: PPTElement) => el.id)

        const sortedNumberItemIds = contentTemplate.elements.filter((el: PPTElement) => checkTextType(el, 'itemNumber')).sort((a: PPTElement, b: PPTElement) => {
          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map((el: PPTElement) => el.id)

        const itemTitles: string[] = []
        const itemTexts: string[] = []

        for (const _item of item.data.items) {
          if (_item.title) itemTitles.push(_item.title)
          if (_item.text) itemTexts.push(_item.text)
        }
        const longestTitle = itemTitles.reduce((longest: string, current: string) => current.length > longest.length ? current : longest, '')
        const longestText = itemTexts.reduce((longest: string, current: string) => current.length > longest.length ? current : longest, '')

        const elements = contentTemplate.elements.map((el: PPTElement) => {
          if (el.type === 'image' && el.imageType) {
            if (imgPool.value.length && el.imageType !== 'itemFigure') return getNewImgElement(el as PPTImageElement)
            return el
          }
          if (el.type !== 'text' && el.type !== 'shape') return el
          if (item.data.items.length === 1) {
            const contentItem = item.data.items[0]
            if (checkTextType(el, 'content') && contentItem.text) {
              return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: contentItem.text, maxLine: 6 })
            }
          }
          else {
            if (checkTextType(el, 'itemTitle')) {
              const index = sortedTitleItemIds.findIndex((id: string) => id === el.id)
              const contentItem = item.data.items[index]
              if (contentItem && contentItem.title) {
                return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: contentItem.title, longestText: longestTitle, maxLine: 1 })
              }
            }
            if (checkTextType(el, 'item')) {
              const index = sortedTextItemIds.findIndex((id: string) => id === el.id)
              const contentItem = item.data.items[index]
              if (contentItem && contentItem.text) {
                return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: contentItem.text, longestText, maxLine: 4 })
              }
            }
            if (checkTextType(el, 'itemNumber')) {
              const index = sortedNumberItemIds.findIndex((id: string) => id === el.id)
              const offset = item.offset || 0
              return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: index + offset + 1 + '', maxLine: 1, digitPadding: true })
            }
          }
          if (checkTextType(el, 'title') && item.data.title) {
            return getNewTextElement({ el: el as PPTTextElement | PPTShapeElement, text: item.data.title, maxLine: 1 })
          }
          return el
        })
        const newSlideId = nanoid(10)
        slides.push({ ...contentTemplate, id: newSlideId, elements })

        if (enableImage) {
          pendingImageFillInfos.push({
            slideIndex: slides.length - 1,
            template: contentTemplate,
            title: item.data.title || 'Presentation Content',
            itemTitles: item.data.items.map((i: { title?: string }) => i.title || ''),
          })
        }
      }
      else if (item.type === 'table') {
        if (tableBaseTemplate) {
          slides.push(createTableSlide(
            tableBaseTemplate,
            item.data.title,
            item.data.headers,
            item.data.rows,
            themeColor,
          ))
        }
      }
      else if (item.type === 'end') {
        const endTemplate = JSON.parse(JSON.stringify(endTemplates[Math.floor(Math.random() * endTemplates.length)]))
        const elements = endTemplate.elements.map((el: PPTElement) => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el as PPTImageElement)
          return el
        })
        slides.push({
          ...endTemplate,
          id: nanoid(10),
          elements,
        })
        if (enableImage) {
          pendingImageFillInfos.push({
            slideIndex: slides.length - 1,
            template: endTemplate,
            title: 'End of Presentation',
            itemTitles: [],
          })
        }
      }
    }
    if (isEmptySlide.value) slidesStore.setSlides(slides)
    else addSlidesFromData(slides)

    // Fire async image slot fills — resolve IDs from the store
    // (addSlidesFromData remaps all element & slide IDs, so we must look up the actual IDs)
    for (const info of pendingImageFillInfos) {
      const localSlide = slides[info.slideIndex]
      // After addSlidesFromData, element IDs in localSlide.elements have been mutated in-place.
      // But slide.id was NOT mutated — find the actual store slide by matching an element ID.
      const probeElId = localSlide.elements[0]?.id
      if (!probeElId) continue
      const storeSlide = slidesStore.slides.find(s => s.elements.some(el => el.id === probeElId))
      if (!storeSlide) continue
      fillImageSlotsAsync(storeSlide.id, storeSlide, info.title, info.itemTitles)
    }
  }

  return {
    presetImgPool,
    AIPPT,
    getMdContent,
  }
}