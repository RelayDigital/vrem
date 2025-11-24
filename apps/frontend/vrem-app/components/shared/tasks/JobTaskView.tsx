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
  Image as ImageIcon,
  File,
  Box,
  Upload,
  Grid3x3,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ImageWithFallback } from "../../common";
import { H3, H4, P, Small, Muted } from "@/components/ui/typography";
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { SiGoogledrive, SiDropbox } from "react-icons/si";

import { FileUploaderRegular } from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Input } from "../../ui/input";
import { ButtonGroup } from "../../ui/button-group";
import { FaGoogleDrive, FaDropbox } from "react-icons/fa";
import { DiOnedrive } from "react-icons/di";

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
  onChangePhotographer?: () => void; // For reassigning photographer
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
  onChangePhotographer,
  variant = "sheet",
  onFullScreen,
}: JobTaskViewProps) {
  const [activeTab, setActiveTab] = useState<
    "description" | "discussion" | "attachments" | "media"
  >("discussion");
  const [activeChatTab, setActiveChatTab] = useState<"client" | "team">("team");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [hasEditorContent, setHasEditorContent] = useState(false);
  const [hasEditEditorContent, setHasEditEditorContent] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<Array<{
    id: string;
    name: string;
    type: "image" | "video" | "floor-plan" | "3d-content" | "file";
    url: string;
    thumbnail?: string;
    size: number;
    uploadedAt: Date;
  }>>([]);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [threeDUrl, setThreeDUrl] = useState<string>("");
  const [cloudStorageDialog, setCloudStorageDialog] = useState<{
    open: boolean;
    service: string;
  }>({ open: false, service: "" });
  const [connectingService, setConnectingService] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          bgColor: "bg-status-pending",
          textColor: "text-status-pending",
          indicatorColor: "bg-status-pending",
        };
      case "assigned":
        return {
          label: "Assigned",
          bgColor: "bg-status-assigned",
          textColor: "text-status-assigned",
          indicatorColor: "bg-status-assigned",
        };
      case "in_progress":
        return {
          label: "In Progress",
          bgColor: "bg-status-in-progress",
          textColor: "text-status-in-progress",
          indicatorColor: "bg-status-in-progress",
        };
      case "editing":
        return {
          label: "Editing",
          bgColor: "bg-status-editing",
          textColor: "text-status-editing",
          indicatorColor: "bg-status-editing",
        };
      case "delivered":
        return {
          label: "Delivered",
          bgColor: "bg-status-delivered",
          textColor: "text-status-delivered",
          indicatorColor: "bg-status-delivered",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          bgColor: "bg-status-cancelled",
          textColor: "text-status-cancelled",
          indicatorColor: "bg-status-cancelled",
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

  // Media management functions
  const getMediaTypeIcon = (type: "image" | "video" | "floor-plan" | "3d-content" | "file") => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-10 w-10 text-muted-foreground" />;
      case "video":
        return <Video className="h-10 w-10 text-muted-foreground" />;
      case "floor-plan":
        return <FileText className="h-10 w-10 text-muted-foreground" />;
      case "3d-content":
        return <Box className="h-10 w-10 text-muted-foreground" />;
      default:
        return <File className="h-10 w-10 text-muted-foreground" />;
    }
  };

  const handleUploadcareSuccess = (info: any, category: "image" | "video" | "floor-plan" | "file") => {
    // info.allEntries is an array of OutputFileEntry
    if (!info || !info.allEntries || info.allEntries.length === 0) return;

    const newMediaItems = info.allEntries.map((entry: any) => ({
      id: entry.uuid,
      name: entry.name,
      type: category,
      url: entry.cdnUrl,
      size: entry.size,
      uploadedAt: new Date(),
    }));

    setUploadedMedia((prev: any[]) => [...prev, ...newMediaItems]);
  };


  const getMediaByCategory = (category: "image" | "video" | "floor-plan" | "3d-content" | "file") => {
    return uploadedMedia.filter((item) => item.type === category);
  };

  const getUploadcareAcceptTypes = (category: "image" | "video" | "floor-plan" | "file") => {
    switch (category) {
      case "image":
        return "image/*";
      case "video":
        return "video/*";
      case "floor-plan":
        return "image/*";
      case "file":
        return "*";
      default:
        return "*";
    }
  };

  const handleViewMedia = (item: {
    id: string;
    name: string;
    type: "image" | "video" | "floor-plan" | "3d-content" | "file";
    url: string;
  }) => {
    // Open media in new window or modal
    window.open(item.url, "_blank");
  };

  const handleDeleteMedia = (id: string) => {
    setUploadedMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) {
        // Only revoke object URLs (blob URLs), not regular URLs
        if (item.url.startsWith("blob:")) {
          URL.revokeObjectURL(item.url);
        }
      }
      return prev.filter((m) => m.id !== id);
    });
  };

  const handleUrlUpload = (url: string, category: "3d-content") => {
    if (!url.trim()) return;

    // Validate URL
    try {
      new URL(url);
    } catch {
      // Invalid URL, could show error message here
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const urlParts = url.split("/");
    const fileName = urlParts[urlParts.length - 1] || "3D Model";

    const newMedia = {
      id,
      name: fileName,
      type: category,
      url,
      size: 0,
      uploadedAt: new Date(),
    };

    setUploadedMedia((prev) => [...prev, newMedia]);
    setThreeDUrl("");
  };

  const handleCloudStorage = (service: "google-drive" | "dropbox" | "onedrive", category: "image" | "video" | "floor-plan" | "file") => {
    // This would integrate with the respective cloud storage APIs
    // For now, we'll show a placeholder implementation
    console.log(`Opening ${service} file picker for ${category}`);

    // In a real implementation, you would:
    // 1. Initialize the cloud storage SDK (e.g., Google Drive API, Dropbox API, OneDrive API)
    // 2. Open a file picker dialog
    // 3. Handle the selected files
    // 4. Download/import the files and add them to uploadedMedia

    // Example placeholder:
    // if (service === "google-drive") {
    //   // Use Google Drive Picker API
    //   window.gapi.load('picker', () => {
    //     const picker = new google.picker.PickerBuilder()
    //       .setOAuthToken(accessToken)
    //       .addView(google.picker.ViewId.DOCS)
    //       .setCallback((data) => {
    //         if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
    //           // Handle selected files
    //         }
    //       })
    //       .build();
    //     picker.setVisible(true);
    //   });
    // }

    // Show alert dialog instead of browser alert
    const serviceName = service.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase());
    setConnectingService(service);
    // Simulate a delay to show the spinner
    setTimeout(() => {
      setCloudStorageDialog({ open: true, service: serviceName });
    }, 500);
  };

  const renderMediaCategory = (
    category: "image" | "video" | "floor-plan" | "3d-content" | "file",
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const categoryMedia = getMediaByCategory(category);
    const isDragging = draggingCategory === category;
    const categoryName = category === "floor-plan" ? "Floor Plans" : category === "3d-content" ? "3D Content" : category.charAt(0).toUpperCase() + category.slice(1) + "s";

    // Special handling for 3D Content (URL input)
    if (category === "3d-content") {
      return (
        <div className="py-4 space-y-4">
          {categoryMedia.length === 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="Enter 3D model URL (e.g., https://example.com/model.glb)"
                    value={threeDUrl}
                    onChange={(e) => setThreeDUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUrlUpload(threeDUrl, "3d-content");
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleUrlUpload(threeDUrl, "3d-content")}
                    disabled={!threeDUrl.trim()}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Add URL
                  </Button>
                </div>
                <P className="text-xs text-muted-foreground">
                  Enter a URL to a 3D model file (GLB, GLTF, OBJ, FBX, etc.)
                </P>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <P className="text-sm font-medium text-foreground">
                  {categoryMedia.length} {categoryMedia.length === 1 ? "item" : "items"}
                </P>
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="Enter 3D model URL"
                    value={threeDUrl}
                    onChange={(e) => setThreeDUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUrlUpload(threeDUrl, "3d-content");
                      }
                    }}
                    className="w-[300px]"
                  />
                  <Button
                    onClick={() => handleUrlUpload(threeDUrl, "3d-content")}
                    disabled={!threeDUrl.trim()}
                    variant="outline"
                    size="sm"
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Add URL
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categoryMedia.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted hover:border-primary transition-colors"
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted p-4">
                      {getMediaTypeIcon(item.type)}
                      <P className="text-xs text-muted-foreground mt-2 text-center line-clamp-2">
                        {item.name}
                      </P>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-background/90 hover:bg-background"
                          onClick={() => handleViewMedia(item)}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-background/90 hover:bg-background hover:text-destructive"
                          onClick={() => handleDeleteMedia(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <P className="text-xs text-white truncate">{item.name}</P>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (categoryMedia.length === 0) {
      // Show upload area when empty
      return (
        <div className="py-4 space-y-4">
          {(category === "image" || category === "video" || category === "floor-plan" || category === "file") && (
            <div className="flex flex-col items-center gap-2">
              <div onClick={(e) => e.stopPropagation()}>
                <FileUploaderRegular
                  pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || "dbf470d49c954f9f6143"}
                  classNameUploader="uc-light uc-custom"
                  sourceList="local, camera, gdrive, facebook"
                  userAgentIntegration="llm-nextjs"
                  filesViewMode="grid"
                  accept={getUploadcareAcceptTypes(category)}
                  onChange={(info) => handleUploadcareSuccess(info, category)}
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    // Show gallery when there are items
    return (
      <div className="py-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <P className="text-sm font-medium text-foreground">
            {categoryMedia.length} {categoryMedia.length === 1 ? "item" : "items"}
          </P>
          <div className="flex items-center gap-2 flex-wrap">
            {(category === "image" || category === "video" || category === "floor-plan" || category === "file") && (
              <div onClick={(e) => e.stopPropagation()}>
                <FileUploaderRegular
                  pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || "dbf470d49c954f9f6143"}
                  classNameUploader="uc-light uc-custom"
                  sourceList="local, camera, gdrive, facebook"
                  userAgentIntegration="llm-nextjs"
                  filesViewMode="grid"
                  accept={getUploadcareAcceptTypes(category)}
                  onChange={(info) => handleUploadcareSuccess(info, category)}
                />
              </div>
            )}
            {(category === "image" || category === "video" || category === "floor-plan" || category === "file") && (
              <ButtonGroup orientation="horizontal">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloudStorage("google-drive", category)}
                  className="flex items-center gap-2"
                >
                  <FaGoogleDrive className="h-4 w-4" />
                  Google Drive
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloudStorage("dropbox", category)}
                  className="flex items-center gap-2"
                >
                  <FaDropbox className="h-4 w-4" />
                  Dropbox
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloudStorage("onedrive", category)}
                  className="flex items-center gap-2"
                >
                  <DiOnedrive className="h-4 w-4" />
                  OneDrive
                </Button>
              </ButtonGroup>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categoryMedia.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted hover:border-primary transition-colors"
            >
              {(item.type === "image" || item.type === "floor-plan") && (
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              )}
              {item.type === "video" && (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Video className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              {(item.type === "3d-content" || item.type === "file") && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted p-4">
                  {getMediaTypeIcon(item.type)}
                  <P className="text-xs text-muted-foreground mt-2 text-center line-clamp-2">
                    {item.name}
                  </P>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-background/90 hover:bg-background"
                    onClick={() => handleViewMedia(item)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-background/90 hover:bg-background hover:text-destructive"
                    onClick={() => handleDeleteMedia(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <P className="text-xs text-white truncate">{item.name}</P>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
          : "p-4"
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
          {variant === "sheet" && !isMobile && (
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
    <FooterComponent className="flex flex-col! border-t p-4 md:p-6 pt-0 gap-0">
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
        <Tabs defaultValue="task" className="gap-0 size-full px-4 md:px-8">
          <TabsList className="grid w-full grid-cols-2 mt-6">
            <TabsTrigger value="task" onClick={() => setActiveTab("discussion")} className="flex items-center gap-2 cursor-pointer">
              Task
            </TabsTrigger>
            <TabsTrigger value="media" onClick={() => setActiveTab("media")} className="flex items-center gap-2 cursor-pointer">
              Media
            </TabsTrigger>
          </TabsList>
          <TabsContent value="task" className="mt-0">
            <div className="py-6 space-y-6">
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
                    <div className="flex items-center gap-2">
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
                      {onChangePhotographer &&
                        (job?.status === "assigned" || job?.status === "in_progress") && (
                          <Button
                            onClick={onChangePhotographer}
                            variant="muted"
                            size="sm"
                            className="h-7 rounded-full"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Change
                          </Button>
                        )}
                    </div>
                  ) : (
                    onAssignPhotographer && (
                      <Button
                        onClick={onAssignPhotographer}
                        variant="muted"
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
                  <Badge variant="flat" className="flex items-center gap-1.5 mb-1 px-0">
                    <div className={cn(
                      "size-1.5 rounded-full",
                      statusConfig.indicatorColor
                    )} />

                    <span
                      className={cn(
                        "text-[13px] font-medium",
                        statusConfig.textColor
                      )}
                    >
                      {statusConfig.label}
                    </span>
                  </Badge>
                </div>

                {/* Tags (Media Types) */}
                <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                  Tags
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {job.mediaType.map((type, index) => {
                    const Icon = getMediaIcon(type);

                    return (
                      <Badge
                        key={type}
                        variant="muted"

                      >
                        <Icon className="h-3 w-3" />
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Badge>
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
                    size={isMobile ? "icon" : "default"}
                    onClick={() => setActiveTab("description")}
                    className={cn(
                      "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                      activeTab === "description"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden md:block">Description</span>
                    {activeTab === "description" && (
                      <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size={isMobile ? "icon" : "default"}
                    onClick={() => setActiveTab("discussion")}
                    className={cn(
                      "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                      activeTab === "discussion"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="hidden md:block">Discussion</span>
                    {activeTab === "discussion" && (
                      <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size={isMobile ? "icon" : "default"}
                    onClick={() => setActiveTab("attachments")}
                    className={cn(
                      "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                      activeTab === "attachments"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="hidden md:block">Attachments</span>
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
                          {(() => {
                            // Parse date string as local date to avoid timezone shifts
                            const [year, month, day] = job.scheduledDate.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return format(date, "MMM d, yyyy");
                          })()}
                        </P>
                      </div>
                      <div>
                        <H4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Time
                        </H4>
                        <P className="text-sm">
                          {job.scheduledTime && job.estimatedDuration
                            ? (() => {
                                const duration = job.estimatedDuration || 60;
                                // Parse scheduled date and time in local timezone
                                const [year, month, day] = job.scheduledDate.split('-').map(Number);
                                const [hours, minutes] = job.scheduledTime.split(':').map(Number);
                                const scheduledDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
                                const endDateTime = new Date(scheduledDateTime.getTime() + duration * 60 * 1000);
                                
                                // Get timezone abbreviation
                                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                                const timeZoneName = new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || '';
                                
                                return `${format(scheduledDateTime, 'h:mm a')} - ${format(endDateTime, 'h:mm a')} ${timeZoneName}`;
                              })()
                            : job.scheduledTime || 'Not scheduled'}
                        </P>
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
          </TabsContent>
          <TabsContent value="media" className="mt-0">
            <div className="py-6">
              <Accordion type="multiple" className="w-full space-y-2">
                {/* Images Section */}
                <AccordionItem value="images" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Images</span>
                      {getMediaByCategory("image").length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {getMediaByCategory("image").length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderMediaCategory("image", imageInputRef)}
                  </AccordionContent>
                </AccordionItem>

                {/* Videos Section */}
                <AccordionItem value="videos" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Videos</span>
                      {getMediaByCategory("video").length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {getMediaByCategory("video").length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderMediaCategory("video", videoInputRef)}
                  </AccordionContent>
                </AccordionItem>

                {/* Floor Plans Section */}
                <AccordionItem value="floor-plans" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Floor Plans</span>
                      {getMediaByCategory("floor-plan").length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {getMediaByCategory("floor-plan").length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderMediaCategory("floor-plan", floorPlanInputRef)}
                  </AccordionContent>
                </AccordionItem>

                {/* 3D Content Section */}
                <AccordionItem value="3d-content" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Box className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">3D Content</span>
                      {getMediaByCategory("3d-content").length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {getMediaByCategory("3d-content").length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderMediaCategory("3d-content", fileInputRef)}
                  </AccordionContent>
                </AccordionItem>

                {/* Files Section */}
                <AccordionItem value="files" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Files</span>
                      {getMediaByCategory("file").length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {getMediaByCategory("file").length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderMediaCategory("file", fileInputRef)}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );

  return (
    <>
      {/* Delete Message Confirmation Dialog */}
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

      {/* Cloud Storage Integration Dialog */}
      <AlertDialog open={cloudStorageDialog.open} onOpenChange={(open) => setCloudStorageDialog({ open, service: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{cloudStorageDialog.service} Integration</AlertDialogTitle>
            <AlertDialogDescription>
              {cloudStorageDialog.service} integration is coming soon! This feature will allow you to directly attach files from your {cloudStorageDialog.service} account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setCloudStorageDialog({ open: false, service: "" });
              setConnectingService(null);
            }}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {variant === "dialog" ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="md:min-w-[90vw] min-w-[calc(100vw-1rem)] md:max-w-[90vw] md:h-[90vh] h-[calc(100vh-1rem)] md:max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden">
            <DialogTitle className="sr-only">
              {job.propertyAddress} - {job.clientName}
            </DialogTitle>
            <DialogHeader className="border-b">{renderHeader(DialogTitle)}</DialogHeader>
            {renderContent()}
            {activeTab === "discussion" && renderFooter(DialogFooter)}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-[40vw] flex flex-col p-0 gap-0"
          >
            <SheetTitle className="sr-only">
              {job.propertyAddress} - {job.clientName}
            </SheetTitle>
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
