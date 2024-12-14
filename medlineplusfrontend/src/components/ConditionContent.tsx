import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'
import parse, { domToReact, Element, HTMLReactParserOptions } from 'html-react-parser'
import { useCallback, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ConditionContentProps {
  content: string
  className?: string
}

export function ConditionContent({ content, className }: ConditionContentProps) {
  const [topicMap, setTopicMap] = useState<Record<string, number>>({})
  const [urlMap, setUrlMap] = useState<Record<string, { id: number, title: string }>>({})

  useEffect(() => {
    const fetchTopicIds = async () => {
      const urlMatches = content.match(/https?:\/\/[^\s<>"']+/g) || []
      
      if (urlMatches.length === 0) return

      const { data } = await supabase
        .from('MEDLINEPLUS')
        .select('topic_id, title, url')
        .or(`url.in.(${urlMatches.map(url => `"${url}"`).join(',')}),title.in.(${
          urlMatches
            .map(url => url.match(/\/([^/]+)\.html$/)?.[1])
            .filter(Boolean)
            .map(topic => topic ? `'${topic.replace(/-/g, ' ')}'` : null)
            .filter(Boolean)
            .join(',')
        })`)

      if (data) {
        const newTopicMap: Record<string, number> = {}
        const newUrlMap: Record<string, { id: number, title: string }> = {}

        data.forEach(item => {
          const normalizedTitle = item.title.toLowerCase().replace(/\s+/g, '-')
          newTopicMap[normalizedTitle] = item.topic_id

          if (item.url) {
            newUrlMap[item.url] = {
              id: item.topic_id,
              title: normalizedTitle
            }
          }
        })
        
        setTopicMap(newTopicMap)
        setUrlMap(newUrlMap)
      }
    }

    fetchTopicIds()
  }, [content])

  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
  })

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        // Handle "Also Known As" section specifically
        if (domNode.name === 'div' && 
            domNode.children?.[0]?.type === 'text' && 
            domNode.children[0].data?.includes('Also Known As')) {
          const props = {
            className: 'mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50'
          }
          return (
            <div {...props}>
              {domToReact(domNode.children as any, options)}
            </div>
          )
        }

        // Existing link handling code
        if (domNode.name === 'a') {
          const href = domNode.attribs.href
          if (!href) return

          // Check if the exact URL exists in our URL map
          const urlMatch = urlMap[href]
          if (urlMatch) {
            return (
              <Link
                to={`/${urlMatch.id}/${urlMatch.title}`}
                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                {domToReact(domNode.children as any, options)}
              </Link>
            )
          }

          // Fall back to checking if it's a medlineplus.gov URL
          if (href.includes('medlineplus.gov')) {
            const topicMatch = href.match(/\/([^/]+)\.html$/)
            if (topicMatch) {
              const topic = topicMatch[1]
              const topicId = topicMap[topic]
              
              if (topicId) {
                return (
                  <Link
                    to={`/${topicId}/${topic}`}
                    className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                  >
                    {domToReact(domNode.children as any, options)}
                  </Link>
                )
              }
            }
          }

          // For non-MedlinePlus links or if no match found
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1"
            >
              {domToReact(domNode.children as any, options)}
              <ExternalLink className="h-3 w-3" />
            </a>
          )
        }
      }
    }
  }

  return (
    <div 
      className={cn(
        'prose max-w-none dark:prose-invert',
        'text-base leading-relaxed space-y-4',
        '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-4',
        '[&_p]:leading-relaxed',
        '[&_ul]:mt-4 [&_ul]:mb-4 [&_ul]:space-y-2 [&_ul]:list-none',
        '[&_li]:ml-6 [&_li]:relative',
        '[&_li]:before:content-["•"] [&_li]:before:absolute [&_li]:before:left-[-1em]',
        '[&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline',
        'hover:[&_a]:text-blue-800 dark:hover:[&_a]:text-blue-300',
        '[&_a]:font-medium',
        className
      )}
    >
      {parse(sanitizedContent, options)}
    </div>
  )
} 