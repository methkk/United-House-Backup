import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Post } from '../components/Post';
import { supabase } from '../lib/supabase';

interface ProjectData {
  id: string;
  title: string;
  problem: string;
  solution: string;
  score: number;
  created_at: string;
  user_id: string;
  community: {
    id: string;
    name: string;
  };
  project_replies: { count: number }[];
  project_votes: { value: number }[];
}

export function ProjectDetailPage() {
  const { communityName, projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = React.useState<ProjectData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_replies(count),
          project_votes(value),
          community:communities(
            id,
            name
          )
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Project not found or has been deleted');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectDeleted = () => {
    navigate(`/r/${communityName}`);
  };

  const handleBackClick = () => {
    // Check if user came from homepage by looking at the state
    const fromHomepage = location.state?.fromHomepage;
    
    if (fromHomepage) {
      navigate('/', { replace: true });
      
      // Restore scroll position after navigation with a longer delay
      setTimeout(() => {
        const savedScrollPosition = sessionStorage.getItem('homepage-scroll-position');
        const projectPosition = sessionStorage.getItem(`project-${projectId}-position`);
        
        console.log('Restoring positions:', {
          savedScrollPosition,
          projectPosition,
          projectId
        });
        
        if (savedScrollPosition) {
          const scrollPos = parseInt(savedScrollPosition, 10);
          window.scrollTo({
            top: scrollPos,
            behavior: 'auto'
          });
          // Clean up stored positions
          sessionStorage.removeItem('homepage-scroll-position');
          sessionStorage.removeItem(`project-${projectId}-position`);
        } else if (projectPosition) {
          // Fallback to project position if available
          const projectPos = parseInt(projectPosition, 10);
          window.scrollTo({
            top: projectPos,
            behavior: 'auto'
          });
          sessionStorage.removeItem(`project-${projectId}-position`);
        } else {
          // Final fallback - try to find the project element by ID
          const projectElement = document.getElementById(`post-${projectId}`);
          if (projectElement) {
            projectElement.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      }, 200); // Increased delay to ensure DOM is ready
    } else {
      navigate(`/r/${communityName}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error || 'Project not found'}</p>
          <button
            onClick={handleBackClick}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const backText = location.state?.fromHomepage ? 'Back to Home' : `Back to r/${communityName}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={handleBackClick}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backText}
        </button>
      </div>

      <Post
        id={project.id}
        title={project.title}
        problem={project.problem}
        solution={project.solution}
        score={project.score}
        created_at={project.created_at}
        author={project.user_id}
        commentCount={project.project_replies[0]?.count || 0}
        userVote={project.project_votes[0]?.value}
        community={project.community}
        isProject={true}
        showComments={true}
        onDelete={handleProjectDeleted}
      />
    </div>
  );
}