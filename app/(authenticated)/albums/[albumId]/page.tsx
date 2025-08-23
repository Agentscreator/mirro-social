// Generate static params for all possible album IDs
export function generateStaticParams() {
  // Since this uses mock data, we need to provide some example album IDs
  // In a real app, you'd fetch these from your database
  return [
    { albumId: '1' },
    { albumId: '2' },  
    { albumId: '3' },
    { albumId: '4' },
    { albumId: '5' },
    // Add more IDs as needed for your mock data
  ]
}

import AlbumPageClient from './AlbumPageClient'

export default function AlbumPage({ params }: { params: { albumId: string } }) {
  return <AlbumPageClient params={params} />
}