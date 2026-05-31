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
      className={`${SIZE_CLASSES[size] || SIZE_CLASSES.md} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-blue-50 font-bold text-blue-600`}
      title={name}
    >
      {objectUrl ? (
        <img src={objectUrl} alt={name || 'Avatar'} className="h-full w-full object-cover" />
      ) : initials ? (
        initials
      ) : (
        <User size={ICON_SIZES[size] || ICON_SIZES.md} />
      )}
    </div>
  );
};

export default UserAvatar;
