import { useEffect, useRef, useState, type RefObject } from 'react';
import { parseContent, type SiteContent, type SiteCopy } from '../../lib/content';
import type { WorkExperience, WorkPlace } from '../../lib/profile';
import type { PhotoCrop } from '../../lib/photo-crop';

export interface ContentEditorProps {
  initial: SiteContent;
  onSave: (content: SiteContent, photo?: Blob) => Promise<SiteContent | void>;
  onDirty: (dirty: boolean) => void;
}

type ExperienceField = Exclude<keyof WorkExperience, 'place'>;

export interface ContentDraft {
  draft: SiteContent;
  bio: string;
  photoPath: string;
  photoAlt: string;
  photoFile: Blob | null;
  photoCrop: PhotoCrop | undefined;
  croppingPhoto: boolean;
  preparingPhoto: boolean;
  saving: boolean;
  dirty: boolean;
  status: string;
  failed: boolean;
  feedback: RefObject<HTMLParagraphElement | null>;
  changeDraft: (next: SiteContent) => void;
  changeSiteText: (key: Exclude<keyof SiteCopy, 'about'>, value: string) => void;
  changePhone: (value: string) => void;
  changeExperienceField: (index: number, key: ExperienceField, value: string) => void;
  changeExperienceLocation: (
    index: number,
    location: string | undefined,
    place: WorkPlace | undefined,
  ) => void;
  changeBio: (value: string) => void;
  changePhotoAlt: (value: string) => void;
  changePhotoCrop: (value: PhotoCrop | undefined) => void;
  changePhotoPath: (value: string) => void;
  changePhotoFile: (value: Blob | null) => void;
  setCroppingPhoto: (value: boolean) => void;
  setPreparingPhoto: (value: boolean) => void;
  save: () => Promise<void>;
}

function publicationContent({
  draft,
  bio,
  photoPath,
  photoAlt,
  photoFile,
  photoCrop,
}: Pick<
  ContentDraft,
  'draft' | 'bio' | 'photoPath' | 'photoAlt' | 'photoFile' | 'photoCrop'
>): SiteContent {
  if (draft.site.phone.trim() && !draft.site.phoneHref) {
    throw new Error(
      'Enter a phone number using digits, an optional + country code, spaces, parentheses, periods, or dashes. You can also leave it blank.',
    );
  }
  try {
    const hasPhoto = Boolean(photoFile || photoPath.trim());
    const photo = hasPhoto
      ? {
          path: photoFile ? '/profile/pending.jpg' : photoPath.trim(),
          alt: photoAlt.trim(),
          ...(photoCrop ? { crop: photoCrop } : {}),
        }
      : null;
    const about = bio
      .split(/\n\s*\n/)
      .map((text) => text.trim())
      .filter(Boolean);
    return parseContent({
      ...draft,
      profile: { ...draft.profile, photo },
      site: { ...draft.site, about },
    });
  } catch {
    throw new Error(
      'Check required text, photo description, links, contact details, and work dates. An end date must follow its start date.',
    );
  }
}

/** Maintain the unpublished draft and preserve prepared photos across failed saves. */
export function useContentDraft({ initial, onSave, onDirty }: ContentEditorProps): ContentDraft {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [draft, setDraft] = useState(initial);
  const [bio, setBio] = useState(initial.site.about.join('\n\n'));
  const [photoPath, setPhotoPath] = useState(initial.profile.photo?.path ?? '');
  const [photoAlt, setPhotoAlt] = useState(initial.profile.photo?.alt ?? '');
  const [photoFile, setPhotoFile] = useState<Blob | null>(null);
  const [photoCrop, setPhotoCrop] = useState<PhotoCrop | undefined>(initial.profile.photo?.crop);
  const [croppingPhoto, setCroppingPhoto] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (failed) feedback.current?.scrollIntoView({ block: 'nearest' });
  }, [failed, status]);
  const changeDraft = (next: SiteContent): void => {
    setDraft(next);
    setDirty(true);
    onDirty(true);
    setStatus('');
    setFailed(false);
  };
  const changeSiteText = (key: Exclude<keyof SiteCopy, 'about'>, value: string): void =>
    changeDraft({ ...draft, site: { ...draft.site, [key]: value } });
  const changePhone = (value: string): void => {
    const digits = value.trim().replace(/[\s().-]/g, '');
    const phoneHref = /^\+?\d{3,30}$/.test(digits) ? `tel:${digits}` : '';
    changeDraft({ ...draft, site: { ...draft.site, phone: value.trim() ? value : '', phoneHref } });
  };
  const changeExperienceField = (index: number, key: ExperienceField, value: string): void => {
    const experience = draft.profile.experience.map((entry, position) => {
      if (position !== index) return entry;
      const updated = { ...entry, [key]: value };
      if (key === 'endDate' && !value) updated.endDate = null;
      if ((key === 'description' || key === 'location') && !value) delete updated[key];
      return updated;
    });
    changeDraft({ ...draft, profile: { ...draft.profile, experience } });
  };
  const changeExperienceLocation = (
    index: number,
    location: string | undefined,
    place: WorkPlace | undefined,
  ): void => {
    const experience = draft.profile.experience.map((entry, position) => {
      if (position !== index) return entry;
      const updated = { ...entry };
      if (location) {
        updated.location = location;
      } else {
        delete updated.location;
      }
      if (place) {
        updated.place = place;
      } else {
        delete updated.place;
      }
      return updated;
    });
    changeDraft({ ...draft, profile: { ...draft.profile, experience } });
  };
  const save = async (): Promise<void> => {
    if (preparingPhoto || croppingPhoto || saving) return;
    setSaving(true);
    setStatus('');
    setFailed(false);
    try {
      const content = publicationContent({ draft, bio, photoPath, photoAlt, photoFile, photoCrop });
      const published = (await onSave(content, photoFile ?? undefined)) ?? content;
      if (!mounted.current) return;
      setDraft(published);
      setPhotoPath(published.profile.photo?.path ?? '');
      setPhotoFile(null);
      setPhotoCrop(published.profile.photo?.crop);
      setDirty(false);
      onDirty(false);
      setStatus('Published. Your website is updated.');
    } catch (error) {
      if (mounted.current) {
        setFailed(true);
        setStatus(
          error instanceof Error ? error.message : 'Could not publish. Your draft is still here.',
        );
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  const changeBio = (value: string): void => {
    setBio(value);
    changeDraft(draft);
  };
  const changePhotoAlt = (value: string): void => {
    setPhotoAlt(value);
    changeDraft(draft);
  };
  const changePhotoCrop = (value: PhotoCrop | undefined): void => {
    setPhotoCrop(value);
    changeDraft(draft);
  };
  const changePhotoPath = (value: string): void => {
    setPhotoPath(value);
    setPhotoCrop(undefined);
    changeDraft(draft);
  };
  const changePhotoFile = (value: Blob | null): void => {
    setPhotoFile(value);
    let restoredCrop: PhotoCrop | undefined;
    if (!value && photoPath === draft.profile.photo?.path) {
      restoredCrop = draft.profile.photo?.crop;
    }
    setPhotoCrop(restoredCrop);
    changeDraft(draft);
  };

  return {
    draft,
    bio,
    photoPath,
    photoAlt,
    photoFile,
    photoCrop,
    croppingPhoto,
    preparingPhoto,
    saving,
    dirty,
    status,
    failed,
    feedback,
    changeDraft,
    changeSiteText,
    changePhone,
    changeExperienceField,
    changeExperienceLocation,
    changeBio,
    changePhotoAlt,
    changePhotoCrop,
    changePhotoPath,
    changePhotoFile,
    setCroppingPhoto,
    setPreparingPhoto,
    save,
  };
}
