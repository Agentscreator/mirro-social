interface ParsedContact {
  id: string
  name: string
  email?: string
  phone?: string
  isSelected: boolean
  isOnPlatform?: boolean
  userId?: string
}

export class ContactsParser {
  static async parseCSV(file: File): Promise<ParsedContact[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          const contacts: ParsedContact[] = []
          
          // Skip header row if it exists
          const startIndex = lines[0]?.toLowerCase().includes('name') || 
                           lines[0]?.toLowerCase().includes('email') ? 1 : 0
          
          for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue
            
            const columns = line.split(',').map(col => col.trim().replace(/"/g, ''))
            
            if (columns.length >= 1) {
              const contact: ParsedContact = {
                id: `csv_${i}`,
                name: columns[0] || `Contact ${i}`,
                email: columns[1] || undefined,
                phone: columns[2] || undefined,
                isSelected: false
              }
              
              // Only add if we have at least a name
              if (contact.name && contact.name !== `Contact ${i}`) {
                contacts.push(contact)
              }
            }
          }
          
          resolve(contacts)
        } catch (error) {
          reject(new Error('Failed to parse CSV file'))
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  static async parseVCF(file: File): Promise<ParsedContact[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const contacts: ParsedContact[] = []
          const vcards = text.split('BEGIN:VCARD')
          
          for (let i = 1; i < vcards.length; i++) {
            const vcard = vcards[i]
            const lines = vcard.split('\n')
            
            let name = ''
            let email = ''
            let phone = ''
            
            for (const line of lines) {
              const trimmedLine = line.trim()
              
              if (trimmedLine.startsWith('FN:')) {
                name = trimmedLine.substring(3)
              } else if (trimmedLine.startsWith('EMAIL')) {
                email = trimmedLine.split(':')[1] || ''
              } else if (trimmedLine.startsWith('TEL')) {
                phone = trimmedLine.split(':')[1] || ''
              }
            }
            
            if (name) {
              contacts.push({
                id: `vcf_${i}`,
                name,
                email: email || undefined,
                phone: phone || undefined,
                isSelected: false
              })
            }
          }
          
          resolve(contacts)
        } catch (error) {
          reject(new Error('Failed to parse VCF file'))
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  static async parseFile(file: File): Promise<ParsedContact[]> {
    const extension = file.name.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'csv':
      case 'txt':
        return this.parseCSV(file)
      case 'vcf':
        return this.parseVCF(file)
      default:
        throw new Error('Unsupported file format. Please use CSV, VCF, or TXT files.')
    }
  }

  // Simulate checking if contacts are on the platform
  static async checkPlatformUsers(contacts: ParsedContact[]): Promise<ParsedContact[]> {
    // In a real app, you'd make an API call to check which emails/phones are registered
    // For demo purposes, we'll randomly mark some as being on the platform
    return contacts.map(contact => ({
      ...contact,
      isOnPlatform: Math.random() > 0.7, // 30% chance of being on platform
      userId: Math.random() > 0.7 ? `user_${Math.random().toString(36).substr(2, 9)}` : undefined
    }))
  }
}