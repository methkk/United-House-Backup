import React from 'react';
import { Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface TrendingProject {
  id: string;
  title: string;
  score: number;
  created_at: string;
  commentCount: number;
  community: {
    name: string;
  };
}

interface TrendingProjectsProps {
  projects: TrendingProject[];
}

export function TrendingProjects({ projects }: TrendingProjectsProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center mb-4">
        <Lightbulb className="w-5 h-5 text-blue-500 mr-2" />
        <h2 className="text-lg font-semibold">Trending Projects</h2>
      </div>
      <div className="space-y-4">
        {projects.map((project, index) => (
          <Link
            key={project.id}
            to={`/r/${project.community.name.toLowerCase()}`}
            className="flex items-start space-x-4 hover:bg-gray-50 p-2 rounded-md transition-colors"
          >
            <span className="text-2xl font-bold text-gray-400">
              {(index + 1).toString().padStart(2, '0')}
            </span>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 line-clamp-2">{project.title}</h3>
              <div className="flex items-center text-sm text-gray-500 mt-1 space-x-2">
                <span>↑ {project.score}</span>
                <span>•</span>
                <span>{project.commentCount} comments</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(project.created_at))} ago</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}