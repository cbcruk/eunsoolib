import type { Meta } from '@storybook/react-vite'
import { AudioManager } from './audio-manager'
import { CastAudioPlayer } from './audio-player'

const meta = {
  title: 'Components/AudioPlayer',
  component: CastAudioPlayer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <AudioManager />
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof CastAudioPlayer>

export default meta

// 무료 샘플 오디오 URL (CC0 라이선스)
const sampleAudioUrl =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'

export const Default = {
  args: {
    src: sampleAudioUrl,
  },
}

export const MultiplePlayersDemo = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700">Player 1</h3>
        <CastAudioPlayer src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700">Player 2</h3>
        <CastAudioPlayer src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700">Player 3</h3>
        <CastAudioPlayer src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" />
      </div>
    </div>
  ),
}
