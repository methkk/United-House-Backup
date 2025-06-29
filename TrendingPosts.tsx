import React from 'react';
import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface TrendingPost {
  id: string;
  title: string;
  score: number;
  created_at: string;
  commentCount: number;
  community: {
    name: string;
  };
}

interface TrendingPostsProps {
  posts: TrendingPost[];
}

export function TrendingPosts({ posts }: TrendingPostsProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center mb-4">
        <Flame className="w-5 h-5 text-orange-500 mr-2 animate-flame" />
        <h2 className="text-lg font-semibold">Trending Posts</h2>
      </div>
      <div className="space-y-4">
        {posts.map((post, index) => (
          <Link
            key={post.id}
            to={`/r/${post.community.name.toLowerCase()}`}
            className="flex items-start space-x-4 hover:bg-gray-50 p-2 rounded-md transition-colors"
          >
            <span className="text-2xl font-bold text-gray-400">
              {(index + 1).toString().padStart(2, '0')}
            </span>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 line-clamp-2">{post.title}</h3>
              <div className="flex items-center text-sm text-gray-500 mt-1 space-x-2">
                <span>↑ {post.score}</span>
                <span>•</span>
                <span>{post.commentCount} comments</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(post.created_at))} ago</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}