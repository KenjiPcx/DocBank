import { useState, useEffect } from 'react';
import type { DBManagedFileType } from '@/lib/db/schema';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  ImageIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileCodeIcon,
  Loader2Icon,
  TrashIcon,
} from 'lucide-react';
import { useInngestSubscription } from '@inngest/realtime/hooks';
import type { Realtime } from '@inngest/realtime';
import { Progress } from '../ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FileListItemProps {
  file: DBManagedFileType;
  onClick: () => void;
  onDelete: (fileId: string) => Promise<void>;
  token: Realtime.Subscribe.Token;
}

interface FileStatus {
  managedFileId: string;
  status: 'started' | 'processing' | 'completed' | 'error';
  step: string;
  message: string;
  progress: number;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/'))
    return <ImageIcon className="h-5 w-5 text-gray-500" />;
  if (mimeType === 'application/pdf')
    return <FileTextIcon className="h-5 w-5 text-red-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return <FileSpreadsheetIcon className="h-5 w-5 text-green-500" />;
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileTextIcon className="h-5 w-5 text-blue-500" />;
  if (mimeType.startsWith('text/'))
    return <FileCodeIcon className="h-5 w-5 text-yellow-500" />;
  return <FileTextIcon className="h-5 w-5 text-gray-500" />;
};

const FileListItem: React.FC<FileListItemProps> = ({
  file,
  onClick,
  onDelete,
  token,
}) => {
  const [fileStatus, setFileStatus] = useState<FileStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data } = useInngestSubscription({
    token: token as Realtime.Subscribe.Token,
  });

  useEffect(() => {
    if (data && data.length > 0 && !file.isEmbedded) {
      console.log(data);
      // Set the latest status as the file status
      const latestStatus = data[data.length - 1].data as FileStatus;
      if (latestStatus.managedFileId === file.id) {
        setFileStatus(latestStatus);
      }
    }
  }, [data, file.id, file.isEmbedded]);

  // useEffect(() => {
  //   if (!file.isEmbedded) {
  //     const fetchToken = async () => {
  //       try {
  //         const response = await fetch('/api/inngest/realtime', {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json',
  //           },
  //         });
  //         if (!response.ok) {
  //           throw new Error('Failed to get subscription token');
  //         }

  //         const { token } = (await response.json()) as {
  //           token: Realtime.Subscribe.Token;
  //         };
  //       } catch (error) {
  //         console.error('Error subscribing to file status updates:', error);
  //       }
  //     };

  //     fetchToken();
  //   }
  // }, [file.id, file.isEmbedded]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the onClick for the whole item
    setIsDeleting(true);
    try {
      await onDelete(file.id);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <li
      className="flex items-center justify-between p-4 border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-150 ease-in-out"
      onClick={onClick}
    >
      <div className="flex items-center space-x-3 flex-grow min-w-0">
        {getFileIcon(file.mimeType)}
        <div className="flex-grow min-w-0">
          <p
            className={`text-sm font-medium ${
              !file.isEmbedded
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-900 dark:text-white'
            } truncate`}
            title={file.name}
          >
            {file.name}
            {!file.isEmbedded && !fileStatus?.status && (
              <span className="ml-2 inline-block">
                <Loader2Icon className="inline-block w-3 h-3 animate-spin" />
              </span>
            )}
            {fileStatus?.status === 'error' && (
              <span className="ml-2 text-xs text-red-500">Error</span>
            )}
          </p>
          <p
            className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xl"
            title={
              file.aiSummary || fileStatus?.message || 'No summary available'
            }
          >
            {file.aiSummary ||
              fileStatus?.message ||
              (file.isEmbedded ? 'No summary available' : 'Processing...')}
          </p>
          {fileStatus &&
            fileStatus.status !== 'completed' &&
            fileStatus.status !== 'error' && (
              <div className="mt-1">
                <Progress value={fileStatus.progress} className="h-1" />
              </div>
            )}
        </div>
      </div>
      <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
        <div className="hidden md:block min-w-0">
          {file.tags?.slice(0, 2).map((tag: string) => (
            <Badge
              key={tag}
              variant="secondary"
              className="mr-1 mb-1 text-xs truncate"
            >
              {tag}
            </Badge>
          ))}
          {file.tags?.length && file.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{file.tags.length - 2}
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right hidden sm:block">
          {(file.size / 1024).toFixed(1)} KB
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 w-24 text-right hidden lg:block">
          {new Date(file.uploadedAt).toLocaleDateString()}
        </p>
        {file.blobDownloadUrl && (
          <a
            href={file.blobDownloadUrl}
            download
            onClick={(e) => e.stopPropagation()}
            className="text-xs p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Download file"
          >
            ⬇️
          </a>
        )}
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the file and all associated data.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Deleting
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
};

export default FileListItem;
