"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExtension from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import { JobRequest, Photographer } from "../../../types";
import { ChatMessage } from "../../../types/chat";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "../../ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import {
  MapPin,
  Calendar,
  Clock,
  Camera,
  Video,
  Plane,
  Sunset,
  User,
  Zap,
  AlertCircle,
  CheckCircle2,
  Send,
  AtSign,
  Maximize2,
  Link,
  X,
  MoreHorizontal,
  Bold,
  Italic,
  Underline,
  Smile,
  Edit,
  Trash2,
  Paperclip,
  FileText,
  MessageSquare,
  Strikethrough,
  List,
  ListOrdered,
  Indent,
  Code,
  Quote,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ImageWithFallback } from "../../common";
import { H3, H4, P, Small, Muted } from "../../ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover";
import { ScrollArea } from "../../ui/scroll-area";
import { useIsMobile } from "../../ui/use-mobile";
import { cn } from "../../ui/utils";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

interface JobTaskViewProps {
  job: JobRequest | null;
  photographer?: Photographer;
  messages: ChatMessage[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  isClient?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendMessage?: (
    content: string,
    chatType: "client" | "team",
    threadId?: string
  ) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onStatusChange?: (status: JobRequest["status"]) => void;
  onAssignPhotographer?: () => void;
  variant?: "sheet" | "dialog";
  onFullScreen?: () => void;
}

export function JobTaskView({
  job,
  photographer,
  messages,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isClient = false,
  open,
  onOpenChange,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onStatusChange,
  onAssignPhotographer,
  variant = "sheet",
  onFullScreen,
}: JobTaskViewProps) {
  const [activeTab, setActiveTab] = useState<
    "description" | "discussion" | "attachments"
  >("discussion");
  const [activeChatTab, setActiveChatTab] = useState<"client" | "team">("team");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [hasEditorContent, setHasEditorContent] = useState(false);
  const [hasEditEditorContent, setHasEditEditorContent] = useState(false);
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        underline: false, // Disable underline from StarterKit to use our extension
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Placeholder.configure({
        placeholder: "Type a message...",
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base focus:outline-none max-w-none min-h-[64px] max-h-[200px] overflow-y-auto px-3.5 py-3 text-sm",
      },
    },
  });

  // Editor for editing messages
  const editEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        underline: false,
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base focus:outline-none max-w-none min-h-[64px] max-h-[120px] overflow-y-auto px-3.5 py-3 text-sm",
      },
    },
  });

  // Update placeholder when chat tab changes
  useEffect(() => {
    if (editor) {
      const placeholderText =
        activeChatTab === "client"
          ? "Type a message for the client..."
          : "Type a message for the team...";
      const placeholderExt = editor.extensionManager.extensions.find(
        (ext) => ext.name === "placeholder"
      );
      if (placeholderExt && placeholderExt.options) {
        placeholderExt.options.placeholder = placeholderText;
        editor.view.dispatch(editor.state.tr);
      }
    }
  }, [editor, activeChatTab]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!(isClient && activeChatTab === "team"));
    }
  }, [editor, isClient, activeChatTab]);

  useEffect(() => {
    if (!open && editor) {
      editor.commands.clearContent();
      setReplyingTo(null);
      setActiveTab("discussion");
      setHasEditorContent(false);
      setEditingMessageId(null);
      if (editEditor) {
        editEditor.commands.clearContent();
      }
    }
  }, [open, editor, editEditor]);

  // Track editor content changes
  useEffect(() => {
    if (!editor) return;

    const updateContent = () => {
      const text = editor.getText().trim();
      setHasEditorContent(text.length > 0);
    };

    editor.on("update", updateContent);
    editor.on("selectionUpdate", updateContent);

    // Initial check
    updateContent();

    return () => {
      editor.off("update", updateContent);
      editor.off("selectionUpdate", updateContent);
    };
  }, [editor]);

  const handleSend = useCallback(() => {
    if (!editor || !onSendMessage) return;
    
    const htmlContent = editor.getHTML();
    const textContent = editor.getText().trim();
    
    if (!textContent) return;

    onSendMessage(htmlContent, activeChatTab, replyingTo?.id);
    editor.commands.clearContent();
    setReplyingTo(null);
    setHasEditorContent(false);
    editor.commands.focus();
  }, [editor, onSendMessage, activeChatTab, replyingTo]);

  const handleEdit = useCallback((message: ChatMessage) => {
    setEditingMessageId(message.id);
  }, []);

  // Update edit editor content when editing message changes
  useEffect(() => {
    if (editingMessageId && editEditor) {
      const message = messages.find((m) => m.id === editingMessageId);
      if (message) {
        // Ensure editor is editable
        editEditor.setEditable(true);
        // Use setTimeout to ensure editor is ready
        setTimeout(() => {
          editEditor.commands.setContent(message.content);
          editEditor.commands.focus('end');
          // Set initial content state
          setHasEditEditorContent(editEditor.getText().trim().length > 0);
        }, 50);
      }
    } else if (!editingMessageId && editEditor) {
      // Clear editor when not editing
      editEditor.commands.clearContent();
      setHasEditEditorContent(false);
    }
  }, [editingMessageId, editEditor, messages]);

  // Track edit editor content changes
  useEffect(() => {
    if (!editEditor) return;

    const updateContent = () => {
      const text = editEditor.getText().trim();
      setHasEditEditorContent(text.length > 0);
    };

    editEditor.on("update", updateContent);
    editEditor.on("selectionUpdate", updateContent);

    // Initial check
    updateContent();

    return () => {
      editEditor.off("update", updateContent);
      editEditor.off("selectionUpdate", updateContent);
    };
  }, [editEditor]);

  const handleSaveEdit = useCallback(() => {
    if (!editEditor || !editingMessageId || !onEditMessage) return;
    
    const htmlContent = editEditor.getHTML();
    const textContent = editEditor.getText().trim();
    
    if (!textContent) {
      setEditingMessageId(null);
      return;
    }

    onEditMessage(editingMessageId, htmlContent);
    setEditingMessageId(null);
    editEditor.commands.clearContent();
  }, [editEditor, editingMessageId, onEditMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    if (editEditor) {
      editEditor.commands.clearContent();
    }
  }, [editEditor]);

  const handleDeleteClick = useCallback((messageId: string) => {
    setDeletingMessageId(messageId);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deletingMessageId && onDeleteMessage) {
      onDeleteMessage(deletingMessageId);
      setDeletingMessageId(null);
    }
  }, [deletingMessageId, onDeleteMessage]);

  const handleDeleteCancel = useCallback(() => {
    setDeletingMessageId(null);
  }, []);

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("keydown", handleKeyDown);

    return () => {
      editorElement.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, handleSend]);

  // Early return must be after all hooks
  if (!job) return null;

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "photo":
        return Camera;
      case "video":
        return Video;
      case "aerial":
        return Plane;
      case "twilight":
        return Sunset;
      default:
        return Camera;
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          label: "Urgent",
          color: "text-destructive",
        };
      case "rush":
        return {
          label: "Rush",
          color: "text-orange-500",
        };
      default:
        return {
          label: "Standard",
          color: "text-primary",
        };
    }
  };

  const getStatusConfig = (status: JobRequest["status"]) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          bgColor: "bg-orange-100",
          textColor: "text-orange-600",
          indicatorColor: "bg-orange-500",
        };
      case "assigned":
        return {
          label: "Assigned",
          bgColor: "bg-primary/10",
          textColor: "text-primary",
          indicatorColor: "bg-primary",
        };
      case "in_progress":
        return {
          label: "In Progress",
          bgColor: "bg-accent/10",
          textColor: "text-accent",
          indicatorColor: "bg-accent",
        };
      case "editing":
        return {
          label: "Editing",
          bgColor: "bg-orange-100",
          textColor: "text-orange-600",
          indicatorColor: "bg-orange-500",
        };
      case "delivered":
        return {
          label: "Delivered",
          bgColor: "bg-emerald-100",
          textColor: "text-emerald-600",
          indicatorColor: "bg-emerald-500",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          bgColor: "bg-muted",
          textColor: "text-muted-foreground",
          indicatorColor: "bg-muted-foreground",
        };
      default:
        return {
          label: status,
          bgColor: "bg-muted",
          textColor: "text-muted-foreground",
          indicatorColor: "bg-muted-foreground",
        };
    }
  };

  const priorityConfig = getPriorityConfig(job.priority);
  const statusConfig = getStatusConfig(job.status);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
  };

  const handleFullScreen = () => {
    if (onFullScreen) {
      onFullScreen();
    }
  };

  const handleMarkComplete = () => {
    if (onStatusChange) {
      onStatusChange("delivered");
    }
  };

  // Filter messages by chat type
  const clientMessages = messages.filter((m) => m.chatType === "client");
  const teamMessages = messages.filter((m) => m.chatType === "team");

  // Helper function to process messages for a given chat type
  const processMessages = (messageList: ChatMessage[]) => {
    const threadMap = new Map<string, ChatMessage[]>();
    const rootMessages: ChatMessage[] = [];
    const messageIds = new Set(messageList.map((m) => m.id));

    messageList.forEach((message) => {
      if (message.threadId) {
        // Check if parent message exists
        if (messageIds.has(message.threadId)) {
          // Parent exists, add to thread map
          if (!threadMap.has(message.threadId)) {
            threadMap.set(message.threadId, []);
          }
          threadMap.get(message.threadId)!.push(message);
        } else {
          // Parent doesn't exist (orphaned reply), show as root message
          rootMessages.push(message);
        }
      } else {
        rootMessages.push(message);
      }
    });

    // Sort messages by date
    const sortedRootMessages = [...rootMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return { sortedRootMessages, threadMap };
  };

  const clientProcessed = processMessages(clientMessages);
  const teamProcessed = processMessages(teamMessages);

  const renderMessage = (message: ChatMessage, isThread = false, threadMap?: Map<string, ChatMessage[]>) => {
    const threadMessages = threadMap?.get(message.id) || [];
    const isOwnMessage = message.userId === currentUserId;
    const isEditing = editingMessageId === message.id;

    return (
      <div
        key={message.id}
        className={cn("flex gap-2.5 relative", isThread && "ml-8 mt-3")}
      >
        {/* Thread line indicator for replies */}
        {isThread && (
          <div className="absolute left-[-20px] top-0 w-px bg-border" style={{ height: '100%' }} />
        )}
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={message.userAvatar} alt={message.userName} />
          <AvatarFallback className="text-xs bg-muted">
            {message.userName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="group">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm font-medium text-foreground">
                {message.userName}
              </span>
              <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/40" />
              <span className="text-xs text-muted-foreground">
                {format(new Date(message.createdAt), "MMM d, h:mm a")}
              </span>
            </div>
            
            {isEditing ? (
              <div className="mb-1.5">
                <div className="bg-muted/50 border border-border rounded-2xl overflow-hidden flex flex-col">
                  <EditorContent
                    editor={editEditor}
                    className="[&_.ProseMirror]:min-h-[64px] [&_.ProseMirror]:max-h-[120px] [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:px-3.5 [&_.ProseMirror]:py-3 [&_.ProseMirror]:text-sm [&_.ProseMirror]:text-foreground [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:prose [&_.ProseMirror]:prose-sm [&_.ProseMirror]:max-w-none [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline"
                  />
                  <div className="flex items-center justify-end gap-2 px-3.5 py-2 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 text-xs"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSaveEdit}
                      disabled={!editEditor || !hasEditEditorContent}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="text-[13px] leading-relaxed text-foreground wrap-break-word mb-1.5 prose prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            )}
            
            {!isEditing && (
              <div className="flex items-center gap-2.5 mt-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setReplyingTo(message)}
                >
                  Reply
                </Button>
                {isOwnMessage && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleEdit(message)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteClick(message.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          {threadMessages.length > 0 && (
            <div className="mt-2 space-y-2 relative pl-2">
              {/* Vertical line connecting replies to parent */}
              <div className="absolute left-0 top-0 w-px bg-border" style={{ height: '100%' }} />
              {threadMessages
                .sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                )
                .map((threadMsg) => renderMessage(threadMsg, true, threadMap))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render header content (shared between Sheet and Dialog)
  const renderHeader = (
    TitleComponent: typeof SheetTitle | typeof DialogTitle
  ) => (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
         variant === "sheet"
           ? "sticky top-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
           : "p-4 pb-0"
      )}
    >
      {/* Content Header */}
      <Item size="sm" variant="outline" className="size-full">
        <ItemMedia className="">
          <MapPin className="size-6" />
        </ItemMedia>
        <ItemContent className="">
          <ItemTitle className="">{job.propertyAddress}</ItemTitle>
          <ItemDescription className="">
            Client: {job.clientName}
          </ItemDescription>
        </ItemContent>
        <ItemActions className="">
          {variant === "sheet" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFullScreen}
                    className="h-8 w-8"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View in full screen</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyLink}
                  className="h-8 w-8"
                >
                  <Link className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy link</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {onStatusChange && job.status !== "delivered" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMarkComplete}
                    className="h-8 w-8"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mark as complete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ItemActions>
      </Item>
    </div>
  );

  // Render footer content (shared between Sheet and Dialog)
  const renderFooter = (
    FooterComponent: typeof SheetFooter | typeof DialogFooter
  ) => (
    <FooterComponent className="flex flex-col! border-t p-6 pt-0 gap-0">
      {/* Chat Type Tabs - Only show when Discussion tab is active */}
      {activeTab === "discussion" && (
        <div className="flex items-center gap-6 pt-2 mb-4">
          <Button
            variant="ghost"
            onClick={() => setActiveChatTab("client")}
            className={cn(
              "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
              activeChatTab === "client"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Client Chat
            {activeChatTab === "client" && (
              <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveChatTab("team")}
            className={cn(
              "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
              activeChatTab === "team"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-3.5 w-3.5" />
            Team Chat
            {!isClient && (
              <Badge variant="secondary" className="ml-1 text-xs h-4 px-1.5">
                Private
              </Badge>
            )}
            {activeChatTab === "team" && (
              <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </Button>
        </div>
      )}
      {replyingTo && (
        <div className="flex items-center justify-between bg-muted p-3 rounded-lg text-sm">
          <span className="text-muted-foreground">
            Replying to {replyingTo.userName}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyingTo(null)}
            className="h-6 text-xs"
          >
            Cancel
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-0">
        {/* Editor with Avatar */}
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={currentUserAvatar} alt={currentUserName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {currentUserName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative bg-muted/50 border border-border rounded-2xl overflow-hidden flex flex-col">
            <EditorContent
              editor={editor}
              className="[&_.ProseMirror]:min-h-[64px] [&_.ProseMirror]:max-h-[200px] [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:px-3.5 [&_.ProseMirror]:py-3 [&_.ProseMirror]:text-sm [&_.ProseMirror]:text-foreground [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:prose [&_.ProseMirror]:prose-sm [&_.ProseMirror]:max-w-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline"
            />
            
            {/* Formatting Toolbar and Comment Button inside editor */}
            <div className="flex items-center justify-between px-3.5 py-2 border-t border-border/40">
              {/* Formatting Buttons */}
              {isMobile ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-muted"
                      disabled={!editor || (isClient && activeChatTab === "team")}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 w-7 p-0 hover:bg-muted",
                          editor?.isActive("bold") && "bg-muted border border-primary"
                        )}
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        disabled={!editor || (isClient && activeChatTab === "team")}
                      >
                        <Bold className="h-3.5 w-3.5 text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 w-7 p-0 hover:bg-muted",
                          editor?.isActive("italic") && "bg-muted border border-primary"
                        )}
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        disabled={!editor || (isClient && activeChatTab === "team")}
                      >
                        <Italic className="h-3.5 w-3.5 text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 w-7 p-0 hover:bg-muted",
                          editor?.isActive("underline") && "bg-muted border border-primary"
                        )}
                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                        disabled={!editor || (isClient && activeChatTab === "team")}
                      >
                        <Underline className="h-3.5 w-3.5 text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 w-7 p-0 hover:bg-muted",
                          editor?.isActive("strike") && "bg-muted border border-primary"
                        )}
                        onClick={() => editor?.chain().focus().toggleStrike().run()}
                        disabled={!editor || (isClient && activeChatTab === "team")}
                      >
                        <Strikethrough className="h-3.5 w-3.5 text-foreground" />
                      </Button>
                      <div className="h-4 w-px bg-border mx-0.5" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 w-7 p-0 hover:bg-muted",
                          editor?.isActive("bulletList") && "bg-muted border border-primary"
                        )}
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        disabled={!editor || (isClient && activeChatTab === "team")}
                      >
                        <List className="h-3.5 w-3.5 text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 w-7 p-0 hover:bg-muted",
                          editor?.isActive("orderedList") && "bg-muted border border-primary"
                        )}
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        disabled={!editor || (isClient && activeChatTab === "team")}
                      >
                        <ListOrdered className="h-3.5 w-3.5 text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-muted"
                        onClick={() => editor?.chain().focus().liftListItem("listItem").run()}
                        disabled={!editor || (isClient && activeChatTab === "team")}
                      >
                        <Indent className="h-3.5 w-3.5 text-foreground" />
                      </Button>
                      <div className="h-4 w-px bg-border mx-0.5" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 w-7 p-0 hover:bg-muted",
                          editor?.isActive("codeBlock") && "bg-muted border border-primary"
                        )}
                        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                        disabled={!editor || (isClient && activeChatTab === "team")}
                      >
                        <Code className="h-3.5 w-3.5 text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 w-7 p-0 hover:bg-muted",
                          editor?.isActive("blockquote") && "bg-muted border border-primary"
                        )}
                        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                        disabled={!editor || (isClient && activeChatTab === "team")}
                      >
                        <Quote className="h-3.5 w-3.5 text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 w-7 p-0 hover:bg-muted",
                          editor?.isActive("link") && "bg-muted border border-primary"
                        )}
                        onClick={() => {
                          const previousUrl = editor?.getAttributes("link").href;
                          const url = window.prompt("Enter URL:", previousUrl);
                          if (url === null) {
                            return;
                          }
                          if (url === "") {
                            editor?.chain().focus().extendMarkRange("link").unsetLink().run();
                            return;
                          }
                          editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                        }}
                        disabled={!editor || (isClient && activeChatTab === "team")}
                      >
                        <LinkIcon className="h-3.5 w-3.5 text-foreground" />
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 hover:bg-muted",
                      editor?.isActive("bold") && "bg-muted border border-primary"
                    )}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    disabled={!editor || (isClient && activeChatTab === "team")}
                  >
                    <Bold className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 hover:bg-muted",
                      editor?.isActive("italic") && "bg-muted border border-primary"
                    )}
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    disabled={!editor || (isClient && activeChatTab === "team")}
                  >
                    <Italic className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 hover:bg-muted",
                      editor?.isActive("underline") && "bg-muted border border-primary"
                    )}
                    onClick={() => editor?.chain().focus().toggleUnderline().run()}
                    disabled={!editor || (isClient && activeChatTab === "team")}
                  >
                    <Underline className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 hover:bg-muted",
                      editor?.isActive("strike") && "bg-muted border border-primary"
                    )}
                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                    disabled={!editor || (isClient && activeChatTab === "team")}
                  >
                    <Strikethrough className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <div className="h-4 w-px bg-border mx-0.5" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 hover:bg-muted",
                      editor?.isActive("bulletList") && "bg-muted border border-primary"
                    )}
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    disabled={!editor || (isClient && activeChatTab === "team")}
                  >
                    <List className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 hover:bg-muted",
                      editor?.isActive("orderedList") && "bg-muted border border-primary"
                    )}
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    disabled={!editor || (isClient && activeChatTab === "team")}
                  >
                    <ListOrdered className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-muted"
                    onClick={() => editor?.chain().focus().liftListItem("listItem").run()}
                    disabled={!editor || (isClient && activeChatTab === "team")}
                  >
                    <Indent className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <div className="h-4 w-px bg-border mx-0.5" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 hover:bg-muted",
                      editor?.isActive("codeBlock") && "bg-muted border border-primary"
                    )}
                    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    disabled={!editor || (isClient && activeChatTab === "team")}
                  >
                    <Code className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 hover:bg-muted",
                      editor?.isActive("blockquote") && "bg-muted border border-primary"
                    )}
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    disabled={!editor || (isClient && activeChatTab === "team")}
                  >
                    <Quote className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 hover:bg-muted",
                      editor?.isActive("link") && "bg-muted border border-primary"
                    )}
                    onClick={() => {
                      const previousUrl = editor?.getAttributes("link").href;
                      const url = window.prompt("Enter URL:", previousUrl);
                      if (url === null) {
                        return;
                      }
                      if (url === "") {
                        editor?.chain().focus().extendMarkRange("link").unsetLink().run();
                        return;
                      }
                      editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                    }}
                    disabled={!editor || (isClient && activeChatTab === "team")}
                  >
                    <LinkIcon className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                </div>
              )}

              {/* Comment Button */}
              <Button
                onClick={handleSend}
                disabled={
                  !editor ||
                  !hasEditorContent ||
                  (isClient && activeChatTab === "team")
                }
                className="h-[34px] px-[18px] rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-medium">Comment</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </FooterComponent>
  );

  // Render main content (shared between Sheet and Dialog)
  const renderContent = () => (
    <>
      <div
        ref={scrollContainerRef}
        className={cn(
          "flex-1 overflow-y-auto",
          variant === "dialog" ? "max-h-[calc(90vh-200px)]" : ""
        )}
      >
        <div className="px-8 py-6 space-y-6">
          {/* Task Fields Grid */}
          <div className="grid grid-cols-[minmax(0,140px)_1fr] gap-y-3.5">
            {/* Task Name */}
            <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
              Task name
            </div>
            <div className="text-sm font-medium text-foreground">
              {job.propertyAddress}
            </div>

            {/* People */}
            <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
              People
            </div>
            <div className="flex items-center gap-2">
              {photographer ? (
                <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-2.5 py-1.5">
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={photographer.avatar}
                      alt={photographer.name}
                    />
                    <AvatarFallback className="text-xs bg-muted-foreground/20">
                      {photographer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    {photographer.name}
                  </span>
                </div>
              ) : (
                onAssignPhotographer && (
                  <Button
                    onClick={onAssignPhotographer}
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full"
                  >
                    Assign Photographer
                  </Button>
                )
              )}
            </div>

            {/* Due Date */}
            <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
              Due date
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(job.scheduledDate), "d MMMM yyyy")}
            </div>

            {/* Status */}
            <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
              Status
            </div>
            <div>
              <div
                className={cn(
                  "inline-flex items-center gap-2 h-7 px-2.5 rounded-full",
                  statusConfig.bgColor
                )}
              >
                <div
                  className={cn(
                    "h-[18px] w-1.5 rounded-full",
                    statusConfig.indicatorColor
                  )}
                />
                <span
                  className={cn(
                    "text-[13px] font-medium",
                    statusConfig.textColor
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* Tags (Media Types) */}
            <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
              Tags
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {job.mediaType.map((type, index) => {
                const Icon = getMediaIcon(type);
                const isBlue = index % 2 === 0;
                return (
                  <div
                    key={type}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      isBlue
                        ? "bg-primary/10 text-primary"
                        : "bg-accent/10 text-accent"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </div>
                );
              })}
            </div>

            {/* Priority */}
            <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
              Priority
            </div>
            <div
              className={cn("text-[13px] font-medium", priorityConfig.color)}
            >
              {priorityConfig.label}
            </div>

            {/* Created By */}
            <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
              Created by
            </div>
            <div className="inline-flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-muted">
                  {currentUserName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">
                {currentUserName}
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="space-y-4">
            <div className="flex items-center gap-6 border-b border-border pt-2 pb-1">
              <Button
                variant="ghost"
                onClick={() => setActiveTab("description")}
                className={cn(
                  "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                  activeTab === "description"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                Description
                {activeTab === "description" && (
                  <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveTab("discussion")}
                className={cn(
                  "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                  activeTab === "discussion"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Discussion
                {activeTab === "discussion" && (
                  <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveTab("attachments")}
                className={cn(
                  "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                  activeTab === "attachments"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attachments
                {activeTab === "attachments" && (
                  <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Button>
            </div>

          </div>

          {/* Tab Content */}
          <div className="pt-4 space-y-4">
            {activeTab === "description" && (
              <div className="space-y-4">
                <div>
                  <H4 className="text-sm font-semibold text-muted-foreground mb-2">
                    Location
                  </H4>
                  <P className="text-sm">{job.propertyAddress}</P>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <H4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                    </H4>
                    <P className="text-sm">
                      {format(new Date(job.scheduledDate), "MMM d, yyyy")}
                    </P>
                  </div>
                  <div>
                    <H4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time
                    </H4>
                    <P className="text-sm">{job.scheduledTime}</P>
                  </div>
                </div>
                {job.requirements && (
                  <>
                    <Separator />
                    <div>
                      <H4 className="text-sm font-semibold text-muted-foreground mb-2">
                        Requirements
                      </H4>
                      <P className="text-sm whitespace-pre-wrap">
                        {job.requirements}
                      </P>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "discussion" && (
              <div className="flex flex-col gap-4">
                {/* Chat Content */}
                {activeChatTab === "client" ? (
                  <ScrollArea className="flex-1 pr-4 min-h-[400px]">
                    <div className="">
                      {clientMessages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No messages in client chat yet
                        </div>
                      ) : (
                        clientProcessed.sortedRootMessages.map((message) =>
                          renderMessage(message, false, clientProcessed.threadMap)
                        )
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <ScrollArea className="flex-1 pr-4 min-h-[400px]">
                    <div className="">
                      {teamMessages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No messages in team chat yet
                        </div>
                      ) : (
                        teamProcessed.sortedRootMessages.map((message) =>
                          renderMessage(message, false, teamProcessed.threadMap)
                        )
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {activeTab === "attachments" && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No attachments yet
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingMessageId !== null} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMessageId && (() => {
                // Check if this message has replies
                const hasReplies = messages.some((m) => m.threadId === deletingMessageId);
                return hasReplies
                  ? "This message has replies. Only the message will be deleted, replies will remain."
                  : "Are you sure you want to delete this message? This action cannot be undone.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {variant === "dialog" ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="md:min-w-[90vw] min-w-[calc(100vw-1rem)] md:max-w-[90vw] md:h-[90vh] h-[calc(100vh-1rem)] md:max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden">
            <DialogHeader>{renderHeader(DialogTitle)}</DialogHeader>
            {renderContent()}
            {activeTab === "discussion" && renderFooter(DialogFooter)}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-[640px] flex flex-col p-0 gap-0"
          >
            <SheetHeader className="border-b">
              {renderHeader(SheetTitle)}
            </SheetHeader>
            {renderContent()}
            {activeTab === "discussion" && renderFooter(SheetFooter)}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
