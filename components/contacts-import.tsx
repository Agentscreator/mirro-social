"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Upload, 
  Users, 
  Search, 
  Check, 
  X, 
  UserPlus, 
  Mail,
  Phone,
  AlertCircle,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ContactsParser } from "@/utils/contacts-parser"

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  avatar?: string
  isSelected: boolean
  isOnPlatform?: boolean
  userId?: string
}

interface ContactsImportProps {
  onContactsSelected?: (contacts: Contact[]) => void
  onSkip?: () => void
  onComplete?: () => void
  className?: string
}

export function ContactsImport({ 
  onContactsSelected, 
  onSkip, 
  onComplete,
  className 
}: ContactsImportProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [importMethod, setImportMethod] = useState<"file" | "manual" | null>(null)
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [manualEntry, setManualEntry] = useState({ name: "", email: "", phone: "" })
  const [showManualForm, setShowManualForm] = useState(false)

  // Mock data for demonstration - in real app, this would come from actual contact import
  const mockContacts: Contact[] = [
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "+1 (555) 123-4567",
      isSelected: false,
      isOnPlatform: true,
      userId: "user_123"
    },
    {
      id: "2", 
      name: "Mike Chen",
      email: "mike.chen@email.com",
      phone: "+1 (555) 987-6543",
      isSelected: false,
      isOnPlatform: false
    },
    {
      id: "3",
      name: "Emma Wilson", 
      email: "emma.w@email.com",
      isSelected: false,
      isOnPlatform: true,
      userId: "user_456"
    },
    {
      id: "4",
      name: "Alex Rodriguez",
      phone: "+1 (555) 456-7890",
      isSelected: false,
      isOnPlatform: false
    }
  ]

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError("")

    try {
      // Parse the uploaded file
      const parsedContacts = await ContactsParser.parseFile(file)
      
      if (parsedContacts.length === 0) {
        setError("No valid contacts found in the file.")
        return
      }

      // Check which contacts are already on the platform
      const contactsWithPlatformStatus = await ContactsParser.checkPlatformUsers(parsedContacts)
      
      setContacts(contactsWithPlatformStatus)
      setImportMethod("file")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import contacts. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleContactToggle = (contactId: string) => {
    const newSelected = new Set(selectedContacts)
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId)
    } else {
      newSelected.add(contactId)
    }
    setSelectedContacts(newSelected)

    // Update contacts array
    setContacts(prev => prev.map(contact => 
      contact.id === contactId 
        ? { ...contact, isSelected: newSelected.has(contactId) }
        : contact
    ))
  }

  const handleSelectAll = () => {
    const filteredContacts = getFilteredContacts()
    const allSelected = filteredContacts.every(contact => selectedContacts.has(contact.id))
    
    const newSelected = new Set(selectedContacts)
    filteredContacts.forEach(contact => {
      if (allSelected) {
        newSelected.delete(contact.id)
      } else {
        newSelected.add(contact.id)
      }
    })
    
    setSelectedContacts(newSelected)
    setContacts(prev => prev.map(contact => ({
      ...contact,
      isSelected: newSelected.has(contact.id)
    })))
  }

  const getFilteredContacts = () => {
    if (!searchQuery) return contacts
    
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery)
    )
  }

  const handleComplete = () => {
    const selectedContactsList = contacts.filter(contact => selectedContacts.has(contact.id))
    onContactsSelected?.(selectedContactsList)
    onComplete?.()
  }

  const handleManualAdd = () => {
    if (!manualEntry.name.trim() || (!manualEntry.email.trim() && !manualEntry.phone.trim())) {
      setError("Please enter a name and either an email or phone number.")
      return
    }

    const newContact: Contact = {
      id: `manual_${Date.now()}`,
      name: manualEntry.name.trim(),
      email: manualEntry.email.trim() || undefined,
      phone: manualEntry.phone.trim() || undefined,
      isSelected: true,
      isOnPlatform: false // Manual entries are assumed to not be on platform
    }

    setContacts(prev => [...prev, newContact])
    setSelectedContacts(prev => new Set([...prev, newContact.id]))
    setManualEntry({ name: "", email: "", phone: "" })
    setError("")
  }

  const handleRemoveContact = (contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId))
    setSelectedContacts(prev => {
      const newSet = new Set(prev)
      newSet.delete(contactId)
      return newSet
    })
  }

  const filteredContacts = getFilteredContacts()
  const selectedCount = selectedContacts.size

  if (!importMethod) {
    return (
      <Card className={cn("w-full max-w-2xl bg-black/80 border border-gray-800/50 backdrop-blur-xl", className)}>
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-light text-white">
            Find your friends
          </CardTitle>
          <CardDescription className="text-gray-400 text-lg">
            Import your contacts to find friends who are already on Mirro and invite others to join
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-xl bg-red-900/20 p-4 border border-red-700/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* File Upload Option */}
            <div className="relative">
              <input
                type="file"
                accept=".csv,.vcf,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isLoading}
              />
              <Button
                variant="outline"
                className="w-full h-16 border-2 border-dashed border-gray-600 hover:border-blue-500 bg-gray-900/40 hover:bg-blue-500/10 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Importing contacts...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Upload contacts file</div>
                      <div className="text-sm text-gray-400">CSV, VCF, or TXT format</div>
                    </div>
                  </div>
                )}
              </Button>
            </div>

            {/* Manual Entry Option */}
            <Button
              variant="outline"
              className="w-full h-16 border-gray-600 hover:border-blue-500 bg-gray-900/40 hover:bg-blue-500/10 transition-all duration-300"
              onClick={() => {
                setImportMethod("manual")
                setShowManualForm(true)
              }}
            >
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Add contacts manually</div>
                  <div className="text-sm text-gray-400">Enter email addresses or phone numbers</div>
                </div>
              </div>
            </Button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={onSkip}
              className="flex-1 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-2xl bg-black/80 border border-gray-800/50 backdrop-blur-xl", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-light text-white">
              Select contacts to connect
            </CardTitle>
            <CardDescription className="text-gray-400">
              {contacts.length} contacts found • {selectedCount} selected
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setImportMethod(null)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Manual Entry Form */}
        {importMethod === "manual" && showManualForm && (
          <div className="space-y-4 p-4 bg-gray-900/40 rounded-lg border border-gray-700/30">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-white">Add a contact</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManualForm(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="manual-name" className="text-sm text-gray-300">Name *</Label>
                <Input
                  id="manual-name"
                  placeholder="Enter contact name"
                  value={manualEntry.name}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-800/60 border-gray-600/50 text-white"
                />
              </div>
              <div>
                <Label htmlFor="manual-email" className="text-sm text-gray-300">Email</Label>
                <Input
                  id="manual-email"
                  type="email"
                  placeholder="Enter email address"
                  value={manualEntry.email}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-gray-800/60 border-gray-600/50 text-white"
                />
              </div>
              <div>
                <Label htmlFor="manual-phone" className="text-sm text-gray-300">Phone</Label>
                <Input
                  id="manual-phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={manualEntry.phone}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-gray-800/60 border-gray-600/50 text-white"
                />
              </div>
            </div>
            
            <Button
              onClick={handleManualAdd}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        )}

        {/* Search and Select All */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900/60 border-gray-700/50 text-white"
            />
          </div>
          
          {importMethod === "manual" && !showManualForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualForm(true)}
              className="w-full border-gray-600 hover:border-blue-500 bg-gray-900/40 hover:bg-blue-500/10"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add another contact
            </Button>
          )}
          
          {filteredContacts.length > 0 && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-blue-400 hover:text-blue-300 p-0 h-auto"
              >
                {filteredContacts.every(contact => selectedContacts.has(contact.id)) ? 'Deselect all' : 'Select all'}
              </Button>
              <span className="text-sm text-gray-400">
                {filteredContacts.length} contacts
              </span>
            </div>
          )}
        </div>

        {/* Contacts List */}
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                  selectedContacts.has(contact.id)
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-gray-900/40 border-gray-700/30 hover:bg-gray-800/60"
                )}
                onClick={() => handleContactToggle(contact.id)}
              >
                <Checkbox
                  checked={selectedContacts.has(contact.id)}
                  onChange={() => handleContactToggle(contact.id)}
                  className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                
                <Avatar className="w-10 h-10">
                  <AvatarImage src={contact.avatar} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">{contact.name}</p>
                    {contact.isOnPlatform && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <Check className="w-3 h-3" />
                        On Mirro
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    {contact.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete button for manually added contacts */}
                {contact.id.startsWith('manual_') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveContact(contact.id)
                    }}
                    className="text-gray-400 hover:text-red-400 p-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-700/30">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="flex-1 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleComplete}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={selectedCount === 0}
          >
            {selectedCount === 0 
              ? "Continue" 
              : `Connect with ${selectedCount} contact${selectedCount === 1 ? '' : 's'}`
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}