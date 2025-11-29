'use client';

import { useState } from 'react';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Photographer, Organization } from '../../../types';
import { Search, Star, Building2, User as UserIcon, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { P } from '@/components/ui/typography';
interface PhotographerSearchProps {
  photographers: Photographer[];
  companies: Organization[];
  onSelect: (photographerId: string) => void;
  preferredVendors?: string[];
}

export function PhotographerSearch({
  photographers,
  companies,
  onSelect,
  preferredVendors = [],
}: PhotographerSearchProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'photographer' | 'company'>('photographer');

  const filteredPhotographers =
    searchType === 'photographer'
      ? photographers.filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase())
        )
      : [];

  const filteredCompanies =
    searchType === 'company'
      ? companies.filter(
          (c) =>
            c.type === 'media_company' &&
            c.name.toLowerCase().includes(query.toLowerCase())
        )
      : [];

  return (
    <div className="space-y-4">
      {/* Search Type Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setSearchType('photographer')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all ${
            searchType === 'photographer'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span>Search Photographers</span>
          </div>
        </button>
        <button
          onClick={() => setSearchType('company')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all ${
            searchType === 'company'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Search Companies</span>
          </div>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            searchType === 'photographer'
              ? 'Search photographers by name...'
              : 'Search media companies...'
          }
          className="pl-12 h-12"
        />
      </div>

      {/* Results */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {searchType === 'photographer' &&
          filteredPhotographers.map((photographer) => {
            const isPreferred = preferredVendors.includes(
              photographer.companyId || photographer.id
            );
            return (
              <motion.button
                key={photographer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelect(photographer.id)}
                className="w-full p-4 border-2 border-border rounded-xl hover:border-indigo-300 transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="size-14 border-2 border-white shadow-md">
                    <AvatarImage src={photographer.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {photographer.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm truncate">{photographer.name}</h4>
                      {isPreferred && (
                        <Heart className="h-4 w-4 fill-red-500 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span>{photographer.rating.overall}</span>
                      <span className="text-muted-foreground/60">•</span>
                      {photographer.isIndependent ? (
                        <Badge variant="outline" className="text-xs h-5">
                          Independent
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>{photographer.companyName}</span>
                        </div>
                      )}
                    </div>
                    {photographer.bio && (
                      <P className="text-xs text-muted-foreground/80 line-clamp-2">
                        {photographer.bio}
                      </P>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}

        {searchType === 'company' &&
          filteredCompanies.map((company) => {
            const isPreferred = preferredVendors.includes(company.id);
            const companyPhotographers = photographers.filter(
              (p) => p.companyId === company.id
            );
            return (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border-2 border-border rounded-xl"
              >
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="size-14 border-2 border-white shadow-md">
                    <AvatarImage src={company.avatar} />
                    <AvatarFallback>
                      {company.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm">{company.name}</h4>
                      {isPreferred && (
                        <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-xs h-5">
                          <Heart className="h-3 w-3 mr-1" />
                          Preferred
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      {company.rating && (
                        <>
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span>{company.rating}</span>
                          <span className="text-muted-foreground/60">•</span>
                        </>
                      )}
                      <span>{company.photographerCount} photographers</span>
                    </div>
                    <P className="text-xs text-muted-foreground/80">{company.description}</P>
                  </div>
                </div>

                {/* Company Photographers */}
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  <div className="text-xs text-muted-foreground/80 mb-2">
                    Available photographers:
                  </div>
                  {companyPhotographers.slice(0, 3).map((photographer) => (
                    <button
                      key={photographer.id}
                      onClick={() => onSelect(photographer.id)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={photographer.avatar} />
                        <AvatarFallback className="text-xs">
                          {photographer.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-foreground truncate">
                          {photographer.name}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/80">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{photographer.rating.overall}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}

        {query &&
          ((searchType === 'photographer' && filteredPhotographers.length === 0) ||
            (searchType === 'company' && filteredCompanies.length === 0)) && (
            <div className="text-center py-8 text-muted-foreground/80">
              <Search className="size-12 mx-auto mb-2 text-muted-foreground/40" />
              <P className="text-sm">No results found</P>
            </div>
          )}

        {!query && (
          <div className="text-center py-8 text-muted-foreground/80">
            <Search className="size-12 mx-auto mb-2 text-muted-foreground/40" />
            <P className="text-sm">
              {searchType === 'photographer'
                ? 'Search for a specific photographer'
                : 'Search for a media company'}
            </P>
          </div>
        )}
      </div>
    </div>
  );
}
