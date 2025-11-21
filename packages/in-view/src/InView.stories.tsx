import type { Meta } from '@storybook/react-vite'
import { useState } from 'react'
import { InView } from './in-view'

const meta = {
  title: 'Components/InView',
  component: InView,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InView>

export default meta

function InfiniteScrollDemo() {
  const [items, setItems] = useState(Array.from({ length: 10 }, (_, i) => i))
  const [loadCount, setLoadCount] = useState(0)

  const loadMore = () => {
    setLoadCount((prev) => prev + 1)
    setItems((prev) => [
      ...prev,
      ...Array.from({ length: 10 }, (_, i) => prev.length + i),
    ])
  }

  return (
    <div className="max-w-xl">
      <div className="p-3 mb-4 bg-blue-50 rounded-md">
        <p className="m-0 text-sm text-blue-900">
          📊 로드 횟수: <strong>{loadCount}</strong>번
        </p>
      </div>

      <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
        {items.map((item) => (
          <div
            key={item}
            className="p-3 mb-2 bg-white rounded-md border border-gray-200"
          >
            Item #{item + 1}
          </div>
        ))}

        <InView onIntersect={loadMore} threshold={0.5}>
          <div className="p-4 text-center text-gray-500 italic">
            🔄 스크롤하여 더 불러오기...
          </div>
        </InView>
      </div>
    </div>
  )
}

export const InfiniteScroll = {
  render: () => <InfiniteScrollDemo />,
}

function OnIntersectDemo() {
  const [intersectCount, setIntersectCount] = useState(0)

  return (
    <div className="max-w-xl">
      <div className="p-3 mb-4 bg-blue-50 rounded-md">
        <p className="m-0 text-sm text-blue-900">
          교차 횟수: <strong>{intersectCount}</strong>번
        </p>
      </div>

      <div className="h-[300px] overflow-y-auto border border-gray-200 p-4">
        <div className="h-[500px] bg-gray-50 p-4">
          <p>아래로 스크롤하세요...</p>
        </div>

        <InView
          onIntersect={() => setIntersectCount((prev) => prev + 1)}
          threshold={0.5}
          className="p-8 bg-blue-100 rounded-lg text-center"
        >
          <p className="m-0 font-bold text-blue-900">
            👀 여기가 보이면 카운터가 증가합니다!
          </p>
        </InView>

        <div className="h-[500px] bg-gray-50 p-4 mt-4">
          <p>위로 스크롤해서 다시 내려오면 카운터가 다시 증가합니다.</p>
        </div>
      </div>
    </div>
  )
}

export const OnIntersect = {
  render: () => <OnIntersectDemo />,
}
