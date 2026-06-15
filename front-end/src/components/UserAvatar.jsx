import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from 'lucide-react';
import userApi from '../api/userApi';

const SIZE_CLASSES = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-24 w-24 text-2xl',
};

const ICON_SIZES = {
  sm: 20,
  md: 24,
  lg: 44,
};

const RING_CLASSES = {
  sm: 'p-0.5',
  md: 'p-0.5',
  lg: 'p-1',
};

const UserAvatar = ({ userId, avatarUrl, name, size = 'md' }) => {
  const avatarQuery = useQuery({
    queryKey: ['userAvatar', userId, avatarUrl],
    queryFn: () => userApi.getAvatarBlob(userId),
    enabled: Boolean(userId && avatarUrl),
    staleTime: 5 * 60 * 1000,
  });

  const objectUrl = useMemo(
    () => (avatarQuery.data ? URL.createObjectURL(avatarQuery.data) : ''),
    [avatarQuery.data]
  );

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const initials = (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={`relative shrink-0 rounded-full bg-gradient-to-br from-sky-500 via-cyan-400 to-emerald-400 shadow-md shadow-cyan-100 ${RING_CLASSES[size] || RING_CLASSES.md}`}
      title={name}
    >
      <div
        className={`${SIZE_CLASSES[size] || SIZE_CLASSES.md} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-gradient-to-br from-sky-50 via-white to-emerald-50 font-black text-sky-600`}
      >
        {objectUrl ? (
          <img
            src={objectUrl}
            alt={name || 'Avatar'}
            className="h-full w-full object-cover"
          />
        ) : initials ? (
          <span className="bg-gradient-to-r from-sky-600 to-emerald-500 bg-clip-text text-transparent">
            {initials}
          </span>
        ) : (
          <User
            size={ICON_SIZES[size] || ICON_SIZES.md}
            className="text-sky-500"
            strokeWidth={1.8}
          />
        )}
      </div>

      {avatarQuery.isFetching && (
        <span className="absolute inset-0 rounded-full border-2 border-white/70 border-t-sky-400 animate-spin" />
      )}
    </div>
  );
};

export default UserAvatar;