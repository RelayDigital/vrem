'use client';

import { useState } from 'react';
import { JobRequest, Photographer } from '../../../types';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { format } from 'date-fns';
import { Flag, MessageSquare, Link as LinkIcon, CheckSquare2, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { cn } from '../../../lib/utils';

interface JobCardKanbanProps {
    job: JobRequest;
    photographer?: Photographer;
    onClick?: () => void;
    onViewRankings?: () => void;
    onJobClick?: () => void;
}

// Map job status to kanban status
const getStatusConfig = (status: JobRequest['status']) => {
    switch (status) {
        case 'delivered':
            return {
                label: 'Complete',
                dotColor: '#22C55E',
                bgColor: '#DCFCE7',
                textColor: '#15803D',
            };
        case 'in_progress':
            return {
                label: 'On Track',
                dotColor: '#EC4899',
                bgColor: '#FCE7F3',
                textColor: '#BE185D',
            };
        case 'pending':
        case 'assigned':
            return {
                label: 'Not Started',
                dotColor: '#8B5CF6',
                bgColor: '#EDE9FE',
                textColor: '#6D28D9',
            };
        case 'editing':
            return {
                label: 'In Research',
                dotColor: '#F59E0B',
                bgColor: '#FEF3C7',
                textColor: '#B45309',
            };
        default:
            return {
                label: 'Not Started',
                dotColor: '#8B5CF6',
                bgColor: '#EDE9FE',
                textColor: '#6D28D9',
            };
    }
};

// Map priority to kanban priority
const getPriorityConfig = (priority: JobRequest['priority']) => {
    // Helper to get CSS variable value
    const getCSSVar = (varName: string): string => {
        if (typeof window === 'undefined') return '';
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    };

    const getPriorityBg = (p: string) => {
        const color = getCSSVar(`--priority-${p}`);
        return color ? `${color}20` : '';
    };

    const getPriorityText = (p: string) => {
        return getCSSVar(`--priority-${p}`) || '';
    };

    switch (priority) {
        case 'urgent':
            return {
                label: 'High',
                bgColor: getPriorityBg('urgent') || '#FEE2E2',
                textColor: getPriorityText('urgent') || '#DC2626',
            };
        case 'rush':
            return {
                label: 'Medium',
                bgColor: getPriorityBg('rush') || '#FEF3C7',
                textColor: getPriorityText('rush') || '#D97706',
            };
        case 'standard':
            return {
                label: 'Low',
                bgColor: getPriorityBg('standard') || '#DBEAFE',
                textColor: getPriorityText('standard') || '#2563EB',
            };
        default:
            return {
                label: 'Low',
                bgColor: getPriorityBg('standard') || '#DBEAFE',
                textColor: getPriorityText('standard') || '#2563EB',
            };
    }
};

export function JobCardKanban({
    job,
    photographer,
    onClick,
    onViewRankings,
    onJobClick,
}: JobCardKanbanProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const statusConfig = getStatusConfig(job.status);
    const priorityConfig = getPriorityConfig(job.priority);

    // Format date
    const formattedDate = format(new Date(job.scheduledDate), 'dd MMM yyyy');

    // Get assignees (photographer if assigned)
    const assignees = photographer ? [photographer] : [];

    // Mock footer data (in real app, these would come from job data)
    const commentsCount = 0;
    const linksCount = 0;
    const checklistProgress = { done: job.mediaType.length, total: job.mediaType.length };

    return (
        <div
            className={cn(
                'group relative w-full max-w-full rounded-2xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.06)] transition-all duration-200',
                'hover:shadow-[0_14px_30px_-12px_rgba(15,23,42,0.10)] hover:-translate-y-px',
                onClick || onJobClick ? 'cursor-pointer' : ''
            )}
            onClick={(e) => {
                // Don't trigger card click if clicking on the dropdown menu area
                if ((e.target as HTMLElement).closest('[role="menu"]') || (e.target as HTMLElement).closest('button[aria-haspopup="menu"]')) {
                    return;
                }
                if (onClick) {
                    onClick();
                } else if (onJobClick) {
                    onJobClick();
                }
            }}
        >
            {/* Status Pill Row */}
            <div className="mb-3 flex items-center justify-between">
                <div
                    className="inline-flex h-6 items-center gap-2 rounded-full px-2.5 py-1"
                    style={{
                        backgroundColor: statusConfig.bgColor,
                    }}
                >
                    <div
                        className="h-2 w-2 rounded-full"
                        style={{
                            backgroundColor: statusConfig.dotColor,
                        }}
                    />
                    <span
                        className="text-xs font-medium leading-[1.4]"
                        style={{
                            color: statusConfig.textColor,
                        }}
                    >
                        {statusConfig.label}
                    </span>
                </div>

                {/* Order Number */}
                {job.orderNumber && (
                    <span className="text-xs font-medium text-muted-foreground ml-auto mr-2">
                        #{job.orderNumber}
                    </span>
                )}

                <div
                    className="relative z-50"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full text-[#D1D5DB] hover:bg-[#F3F4F6] hover:text-[#6B7280] relative z-50"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    e.nativeEvent.stopImmediatePropagation();
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.nativeEvent.stopImmediatePropagation();
                                }}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More options</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="!z-[9999]"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                        >
                            {onJobClick && (
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setDropdownOpen(false);
                                        onJobClick();
                                    }}
                                >
                                    View Details
                                </DropdownMenuItem>
                            )}
                            {onViewRankings && (job.status === 'pending' || job.status === 'assigned') && (
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setDropdownOpen(false);
                                        onViewRankings();
                                    }}
                                >
                                    Find Photographer
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Card Body */}
            <div className="mb-3 space-y-1">
                <h3 className="line-clamp-2 text-base font-semibold leading-[1.4] text-[#111827]">
                    {job.propertyAddress}
                </h3>
                {job.requirements && (
                    <p className="line-clamp-2 text-[13px] leading-normal text-[#6B7280]">
                        {job.requirements}
                    </p>
                )}
            </div>

            {/* Meta Row */}
            <div className="mb-3 space-y-2">
                {/* Assignees */}
                {assignees.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#6B7280]">Assignees:</span>
                        <div className="flex -space-x-2">
                            {assignees.slice(0, 3).map((assignee, index) => (
                                <Avatar
                                    key={assignee.id}
                                    className="h-6 w-6 border-2 border-white"
                                    style={{ zIndex: assignees.length - index }}
                                >
                                    <AvatarImage src={assignee.avatar} alt={assignee.name} />
                                    <AvatarFallback className="text-[10px]">
                                        {assignee.name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                            {assignees.length > 3 && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#E5E7EB] text-[10px] font-medium text-[#6B7280]">
                                    +{assignees.length - 3}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Date and Priority Row */}
                <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5">
                        <Flag className="h-3.5 w-3.5 text-[#9CA3AF]" />
                        <span className="text-xs leading-[1.4] text-[#6B7280]">{formattedDate}</span>
                    </div>
                    <div
                        className="inline-flex h-6 items-center rounded-full px-3 py-1"
                        style={{
                            backgroundColor: priorityConfig.bgColor,
                        }}
                    >
                        <span
                            className="text-xs font-medium leading-[1.4]"
                            style={{
                                color: priorityConfig.textColor,
                            }}
                        >
                            {priorityConfig.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer Row */}
            <div className="flex items-center gap-4 border-t border-[#F1F2F6] pt-3">
                <div className="inline-flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-[#9CA3AF]" />
                    <span className="text-xs leading-[1.4] text-[#6B7280]">
                        {commentsCount} Comments
                    </span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-[#9CA3AF]" />
                    <span className="text-xs leading-[1.4] text-[#6B7280]">{linksCount} Links</span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                    <CheckSquare2 className="h-3.5 w-3.5 text-[#9CA3AF]" />
                    <span className="text-xs leading-[1.4] text-[#6B7280]">
                        {checklistProgress.done}/{checklistProgress.total}
                    </span>
                </div>
            </div>
        </div>
    );
}

