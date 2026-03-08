/**
 * AI Assistant - Global Chatbot
 * Provides AI-powered assistance for project discovery, skills analysis, and matching
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Send, Minimize2 } from 'lucide-react'
import Image from 'next/image'
import { MarkdownViewer } from './markdown-viewer'

interface Message {
  role: 'user' | 'ai'
  content: string
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content:
        'Hello! I can help you search projects, analyze your skills, or suggest matches. What would you like to know?',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMsg = input
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setIsTyping(true)

    try {
      const { chatWithProjects } = await import('@/lib/api/client')
      const result = await chatWithProjects(userMsg)

      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: result?.response || "I'm sorry, I couldn't process that.",
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'Error connecting to AI service.' },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={() => setIsOpen(true)}
              className="group relative h-24 w-24 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-primary/30"
              aria-label="Open AI Assistant"
            >
              {/* Pulse animation */}
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></span>

              {/* Angel avatar */}
              <div className="relative h-full w-full rounded-full overflow-hidden border-2 border-white/20 group-hover:border-white/40 transition-all">
                <Image
                  src="/angel.webp"
                  alt="AI Assistant"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Sparkle effect on hover */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400 via-primary to-purple-400 opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-300"></div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]"
          >
            <Card className="flex flex-col h-[600px] max-h-[calc(100vh-3rem)] shadow-2xl border-primary/20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl overflow-hidden">
              {/* Header */}
              <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-15 w-15 rounded-full overflow-hidden border-2 border-primary/30 shadow-lg">
                      <Image
                        src="/angel.webp"
                        alt="AI Assistant"
                        fill
                        className="object-cover"
                      />
                      {/* Online indicator */}
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-900"></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-base leading-tight">
                        AI Assistant
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Always here to help
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                      aria-label="Minimize"
                    >
                      <Minimize2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              {!isMinimized && (
                <>
                  <CardContent
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    <AnimatePresence initial={false}>
                      {messages.map((m, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${
                            m.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                              m.role === 'user'
                                ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm'
                                : 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/80 text-foreground rounded-tl-sm border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {m.role === 'user' ? (
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {m.content}
                              </p>
                            ) : (
                              <MarkdownViewer
                                content={m.content}
                                className="prose-sm [&_p]:mb-2 [&_p]:last:mb-0 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_ul]:mb-2 [&_ol]:mb-2"
                              />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
                          <div className="flex gap-1.5 items-center">
                            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>

                  {/* Input */}
                  <CardFooter className="border-t p-3 flex gap-2 bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
                    <Input
                      placeholder="Ask about projects, skills, trends..."
                      value={input}
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus-visible:ring-primary"
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      disabled={isTyping}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={isTyping || !input.trim()}
                      size="icon"
                      className="shrink-0 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
