import { UploadInput, UploadedFileMetadata } from './storage.types'

export const STORAGE_SERVICE = Symbol('IStorageService')

export interface IStorageService {
  upload(input: UploadInput): Promise<UploadedFileMetadata>
  remove(path: string): Promise<void>
  getPublicUrl(path: string): Promise<string>
  exists(path: string): Promise<boolean>
}
