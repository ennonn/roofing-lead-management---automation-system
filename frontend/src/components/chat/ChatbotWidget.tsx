import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  X,
  RotateCcw,
  Bot,
  ExternalLink,
  PhoneCall,
  Menu as MenuIcon,
  HelpCircle,
} from "lucide-react";
import { branding } from "../../config/branding";
import {
  buildChatbotTree,
  ChatOption,
  ChatAction,
} from "../../config/chatbotTree";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string[];
  options?: ChatOption[];
  actions?: ChatAction[];
}

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const tree = buildChatbotTree(branding);

  // Initialize conversation with the root node
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "msg-initial",
      sender: "bot",
      text: tree.root.botMessage,
      options: tree.root.options,
      actions: tree.root.actions,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation whenever messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Handle Escape key to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Handle selecting an option
  const handleSelectOption = (option: ChatOption) => {
    const targetNode = tree[option.targetNodeId] || tree.other;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: [option.label],
    };

    const botMessage: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: "bot",
      text: targetNode.botMessage,
      options: targetNode.options,
      actions: targetNode.actions,
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
  };

  // Handle action button clicks (such as menu)
  const handleSelectAction = (action: ChatAction) => {
    if (action.type === "menu") {
      const rootNode = tree.root;
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: ["Return to Main Menu"],
      };
      const botMessage: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: rootNode.botMessage,
        options: rootNode.options,
        actions: rootNode.actions,
      };
      setMessages((prev) => [...prev, userMessage, botMessage]);
    } else if (action.type === "restart") {
      handleRestart();
    }
  };

  // Restart chat
  const handleRestart = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: "bot",
        text: tree.root.botMessage,
        options: tree.root.options,
        actions: tree.root.actions,
      },
    ]);
  };

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <aside aria-label="Automated Chat Assistant">
      {/* Floating Launcher Button */}
      <button
        ref={launcherRef}
        type="button"
        onClick={toggleChat}
        aria-expanded={isOpen}
        aria-controls="roofing-chatbot-panel"
        aria-label={
          isOpen
            ? "Close roofing assistant chat"
            : "Open roofing assistant chat"
        }
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 inline-flex items-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
      >
        {isOpen ? (
          <X className="w-6 h-6" aria-hidden="true" />
        ) : (
          <MessageSquare className="w-6 h-6" aria-hidden="true" />
        )}
        <span className="hidden sm:inline text-sm font-semibold tracking-wide">
          {isOpen ? "Close" : "Need Help?"}
        </span>
      </button>

      {/* Floating Chat Dialog Window */}
      {isOpen && (
        <div
          ref={dialogRef}
          id="roofing-chatbot-panel"
          role="dialog"
          aria-label="Roofing Assistant Chat"
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 md:w-[410px] h-[520px] max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-sky-600 rounded-lg text-white">
                <Bot className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">
                  {branding.companyName}
                </h2>
                <p className="text-xs text-slate-300 flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
                    aria-hidden="true"
                  />
                  Predefined Decision-Tree Guide
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRestart}
                title="Restart conversation"
                aria-label="Restart conversation"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat window"
                aria-label="Close chat window"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation Body (Scrollable) */}
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-sky-600 text-white rounded-tr-sm font-medium shadow-sm"
                      : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-sm shadow-sm"
                  }`}
                >
                  {msg.text.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className={idx > 0 ? "mt-2 pt-2 border-t border-slate-100" : ""}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Actions (if bot message has action buttons) */}
                {msg.sender === "bot" && msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2 max-w-[95%]">
                    {msg.actions.map((act, actIdx) => {
                      if (act.type === "link" && act.href) {
                        return (
                          <Link
                            key={actIdx}
                            to={act.href}
                            onClick={() => {
                              // If on mobile, close the chat dialog on page transition
                              if (window.innerWidth < 640) {
                                setIsOpen(false);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          >
                            <span>{act.label}</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </Link>
                        );
                      }

                      if (act.type === "tel" && act.href) {
                        return (
                          <a
                            key={actIdx}
                            href={act.href}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                          >
                            <PhoneCall className="w-3 h-3 text-slate-900" aria-hidden="true" />
                            <span>{act.label}</span>
                          </a>
                        );
                      }

                      if (act.type === "menu") {
                        return (
                          <button
                            key={actIdx}
                            type="button"
                            onClick={() => handleSelectAction(act)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          >
                            <MenuIcon className="w-3 h-3 text-slate-500" aria-hidden="true" />
                            <span>{act.label}</span>
                          </button>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}

                {/* Predefined Options (if bot message has options) */}
                {msg.sender === "bot" && msg.options && msg.options.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1.5 w-full max-w-[95%]">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pl-1">
                      Select a topic:
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {msg.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-800 bg-white hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300 border border-slate-200 rounded-lg transition-colors shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          {/* Footer Notice & Quick Link */}
          <div className="p-2.5 bg-white border-t border-slate-200 shrink-0 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <HelpCircle className="w-3 h-3 text-slate-400" aria-hidden="true" />
              Automated Guide • No personal information is collected in chat
            </p>
            <div className="mt-1">
              <Link
                to="/contact"
                onClick={() => {
                  if (window.innerWidth < 640) {
                    setIsOpen(false);
                  }
                }}
                className="text-xs font-medium text-sky-600 hover:text-sky-800 hover:underline inline-flex items-center gap-1"
              >
                Need an in-person estimate? Submit our Official Quote Form →
              </Link>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
