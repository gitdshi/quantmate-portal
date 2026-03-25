import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

// Force Monaco to load from the local bundle instead of the default CDN.
loader.config({ monaco })
